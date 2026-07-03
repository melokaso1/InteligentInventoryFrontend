import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ChatMessage, FulfillmentStatus } from '../types'
import {
  CHAT_SESSION_USER_KEY,
  createNewChatSession,
  fetchChatHealth,
  fetchChatHistory,
  fetchMyOrders,
  getChatSessionId,
  getLatestChatStateFromHistory,
  mapChatHistoryToMessages,
  sendChatMessage,
  type ChatOperationSummary,
} from '../api'
import { ApiError, getUserFacingApiError } from '../api/client'
import { getCurrentUser, isAdmin, isLoggedIn } from '../hooks/useAuth'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { notifyDataMutation } from '../utils/dataSync'
import {
  buildCheckoutLoginUrl,
  CHECKOUT_AUTH_MESSAGE,
  messageRequiresCheckoutAuth,
} from '../utils/checkoutAuth'
import { ChatMessage as ChatMessageComponent, TypingIndicator } from '../components/chat/ChatMessage'
import { ChatHelpFab } from '../components/chat/ChatHelpFab'
import { ChatInput } from '../components/chat/ChatInput'
import { OperationSummary } from '../components/chat/OperationSummary'
import { PurchaseTutorialPanel } from '../components/chat/PurchaseTutorialPanel'
import { Icon } from '../components/ui/Icon'
type MobileView = 'chat' | 'summary'
type HealthStatus = 'checking' | 'healthy' | 'unhealthy'

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    '¡Hola! Soy **Drogui**, tu asistente de ventas en El Plonsazo.\n\n' +
    'Escríbeme en **lenguaje natural** para consultar stock, buscar productos o iniciar una compra. ' +
    'Para ver el catálogo completo, escribe **«ver catálogo»** (se muestra en páginas de 5 productos). ' +
    'Para tus facturas, **pídeme ver factura**.\n\n' +
    '**Ejemplos:**\n' +
    '• «consultar stock de PLZ-MJ-001»\n' +
    '• «buscar lsd» o simplemente «lsd»\n' +
    '• «ver catálogo»\n' +
    '• «quiero comprar cocaina»\n' +
    '• «ver factura» o «mis facturas»\n' +
    '• «agregar al carrito»\n' +
    '• «cancelar»\n\n' +
    'También puedes usar los botones del menú o la guía **¿Cómo comprar?** en **Soporte** del menú superior.',
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  chips: ['¿Cómo me comunico?', 'Ver catálogo', 'Ver factura', 'Consultar stock', 'Buscar producto'],
}

const CHIP_INTENT_MESSAGES: Record<string, string> = {
  'Ver factura': 'ver factura',
  'Ver catálogo': 'ver catálogo',
  '¿Cómo me comunico?': '¿Cómo me comunico?',
  'Consultar stock': 'Consultar stock',
  'Buscar producto': 'Buscar producto',
  'Ver ofertas': 'Ver ofertas',
  'Nueva consulta': 'Buscar producto',
  'Cancelar': 'cancelar',
  'Confirmar compra': 'Confirmar compra',
}

function getChatErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 401) {
    return 'Sesión expirada. Vuelve a iniciar sesión.'
  }
  return getUserFacingApiError(err, 'No pude procesar tu mensaje. Inténtalo de nuevo.', 'chat')
}

export function ChatbotPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [mobileView, setMobileView] = useState<MobileView>('chat')
  const [operationSummary, setOperationSummary] = useState<ChatOperationSummary | null>(null)
  const [chatState, setChatState] = useState('idle')
  const [invoiceNumber, setInvoiceNumber] = useState<string | undefined>()
  const [fulfillmentStatus, setFulfillmentStatus] = useState<FulfillmentStatus | null>(null)
  const [sessionId, setSessionId] = useState(() => getChatSessionId())
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('checking')
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [resumeCheckoutBanner, setResumeCheckoutBanner] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const scrollBehaviorRef = useRef<ScrollBehavior>('smooth')
  const sentInitialForKey = useRef<string | null>(null)
  const requestSeq = useRef(0)
  const latestRequestIdRef = useRef(0)
  const lastCancelSentAtRef = useRef(0)

  const chatAvailable = healthStatus === 'healthy'

  const loadLatestFulfillment = useCallback(async (force = false) => {
    if (!isLoggedIn()) return

    if (
      !force &&
      chatState !== 'sale_completed' &&
      operationSummary?.status !== 'completed'
    ) {
      return
    }

    try {
      const result = await fetchMyOrders({ pageSize: 1 })
      const latest = result.items[0]
      if (latest?.fulfillmentStatus) {
        setFulfillmentStatus(latest.fulfillmentStatus)
      }
    } catch {
      // Keep previous status if fetch fails.
    }
  }, [chatState, operationSummary?.status])

  useRealtimeRefresh(loadLatestFulfillment, [loadLatestFulfillment], {
    scope: ['orders', 'notifications'],
    enabled: chatState === 'sale_completed' || operationSummary?.status === 'completed',
  })

  useEffect(() => {
    const userId = getCurrentUser()?.id ?? 'guest'
    const storedUserId = sessionStorage.getItem(CHAT_SESSION_USER_KEY)
    if (storedUserId !== null && storedUserId !== userId) {
      const newSessionId = createNewChatSession()
      sentInitialForKey.current = null
      latestRequestIdRef.current = 0
      requestSeq.current = 0
      setSessionId(newSessionId)
      setMessages([])
      setOperationSummary(null)
      setChatState('idle')
      setInvoiceNumber(undefined)
      setHistoryLoaded(false)
    }
  }, [])

  useEffect(() => {
    const resumeCheckout = (location.state as { resumeCheckout?: boolean } | null)?.resumeCheckout
    if (resumeCheckout) {
      setResumeCheckoutBanner(true)
    }
  }, [location.state])

  const redirectToCheckoutLogin = useCallback(() => {
    navigate(buildCheckoutLoginUrl())
  }, [navigate])

  const checkHealth = useCallback(async () => {
    try {
      await fetchChatHealth()
      setHealthStatus('healthy')
    } catch {
      setHealthStatus('unhealthy')
    }
  }, [])

  useEffect(() => {
    void checkHealth()
  }, [checkHealth])

  useEffect(() => {
    let cancelled = false

    const loadHistory = async () => {
      setHistoryLoaded(false)
      try {
        const history = await fetchChatHistory(sessionId)
        if (cancelled) return

        if (history.length > 0) {
          setMessages(mapChatHistoryToMessages(history))
          const restored = getLatestChatStateFromHistory(history)
          setChatState(restored.chatState)
          setOperationSummary(restored.operationSummary)
          setInvoiceNumber(restored.invoiceNumber)
          if (restored.chatState === 'sale_completed') {
            void loadLatestFulfillment(true)
          }
        } else {
          setMessages([WELCOME_MESSAGE])
          setChatState('idle')
          setOperationSummary(null)
          setInvoiceNumber(undefined)
        }
      } catch {
        if (!cancelled) {
          setMessages([WELCOME_MESSAGE])
          setChatState('idle')
          setOperationSummary(null)
          setInvoiceNumber(undefined)
        }
      } finally {
        if (!cancelled) {
          setHistoryLoaded(true)
        }
      }
    }

    void loadHistory()
    return () => {
      cancelled = true
    }
  }, [sessionId, loadLatestFulfillment])

  const startNewConversation = () => {
    const newSessionId = createNewChatSession()
    sentInitialForKey.current = null
    latestRequestIdRef.current = 0
    requestSeq.current = 0
    setSessionId(newSessionId)
    setInput('')
    setIsTyping(false)
  }

  useEffect(() => {
    if (healthStatus !== 'unhealthy') return

    const interval = setInterval(() => {
      void checkHealth()
    }, 10_000)

    return () => clearInterval(interval)
  }, [healthStatus, checkHealth])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const behavior = scrollBehaviorRef.current
    scrollBehaviorRef.current = 'smooth'

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.scrollTo({ top: container.scrollHeight, behavior })
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [messages, isTyping])

  const sendMessage = async (text: string) => {
    const normalizedText = text.trim()
    if (!normalizedText || !chatAvailable || !historyLoaded) return

    if (messageRequiresCheckoutAuth(chatState, normalizedText)) {
      redirectToCheckoutLogin()
      return
    }

    const isCancel = /cancelar|cancel/i.test(normalizedText)
    const isConfirm =
      /confirmar\s*compra|confirmo\s*(la\s*)?(compra|pedido)/i.test(normalizedText)

    // Avoid dropping cancel/confirm actions even if a request is currently in-flight.
    if (isTyping && !isCancel && !isConfirm) return

    // Prevent rapid double-clicks from queueing multiple cancels.
    if (isCancel) {
      const now = Date.now()
      if (now - lastCancelSentAtRef.current < 800) return
      lastCancelSentAtRef.current = now
    }

    const requestId = ++requestSeq.current
    latestRequestIdRef.current = requestId

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: normalizedText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    scrollBehaviorRef.current = 'auto'
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const result = await sendChatMessage(sessionId, normalizedText)

      // Ignore out-of-order responses from older requests.
      if (requestId !== latestRequestIdRef.current) return

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        chips: result.chips,
        offers: result.offers,
        offersTotalCount: result.offersTotalCount,
      }
      setMessages((prev) => [...prev, botMsg])
      setChatState(result.state)
      setOperationSummary(result.operationSummary ?? null)
      setInvoiceNumber(result.invoiceNumber)
      if (result.invoiceNumber || result.state === 'sale_completed') {
        notifyDataMutation('sales')
        notifyDataMutation('inventory')
        notifyDataMutation('orders')
        setFulfillmentStatus('preparing')
        void loadLatestFulfillment(true)
      }
    } catch (err) {
      if (requestId === latestRequestIdRef.current) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: getChatErrorMessage(err),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsTyping(false)
      }
    }
  }

  useEffect(() => {
    const initialMessage = (location.state as { initialMessage?: string } | null)?.initialMessage
    if (!initialMessage || sentInitialForKey.current === location.key || !chatAvailable || !historyLoaded) return
    sentInitialForKey.current = location.key
    void sendMessage(initialMessage)
  }, [location.key, location.state, chatAvailable, historyLoaded])

  const handleChipClick = (chip: string) => {
    if (!chatAvailable) return
    if (chip === 'Ver factura') {
      if (!isLoggedIn()) {
        navigate('/login?returnTo=/my-invoices')
        return
      }
      navigate(isAdmin() ? '/invoices' : '/my-invoices')
      return
    }
    if (chip === 'Confirmar compra' && !isLoggedIn()) {
      redirectToCheckoutLogin()
      return
    }
    void sendMessage(CHIP_INTENT_MESSAGES[chip] ?? chip)
  }

  const handleProductClick = (productCode: string) => {
    if (!chatAvailable) return
    void sendMessage(productCode)
  }

  const handleConfirmPurchase = () => {
    if (!isLoggedIn()) {
      redirectToCheckoutLogin()
      return
    }
    void sendMessage('Confirmar compra')
  }

  const guestCheckoutLocked =
    !isLoggedIn() &&
    (chatState === 'awaiting_use_saved_address' ||
      chatState === 'awaiting_delivery_address' ||
      chatState === 'awaiting_save_address')

  const droguiPresenceLabel =
    healthStatus === 'healthy'
      ? 'en línea'
      : healthStatus === 'checking'
        ? 'conectando…'
        : 'sin conexión'

  const droguiPresenceDotClass =
    healthStatus === 'healthy'
      ? 'bg-green-500'
      : healthStatus === 'checking'
        ? 'bg-amber-500 animate-pulse'
        : 'bg-on-surface-variant/50'

  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-hidden lg:flex-row">
      <div
        role="tablist"
        aria-label="Vista del chatbot"
        className="flex shrink-0 items-stretch border-b border-outline-variant bg-surface lg:hidden"
      >
        <div
          className={`flex min-w-0 flex-1 items-stretch ${
            mobileView === 'chat' ? 'border-b-2 border-primary bg-surface-container-lowest/50' : ''
          }`}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobileView === 'chat'}
            onClick={() => setMobileView('chat')}
            className={`flex min-w-0 flex-1 items-center gap-sm px-md py-sm text-left transition-colors ${
              mobileView === 'chat' ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                mobileView === 'chat' ? 'bg-primary/15' : 'bg-surface-container'
              }`}
            >
              <Icon
                name="smart_toy"
                size={20}
                className={mobileView === 'chat' ? 'text-primary' : 'text-on-surface-variant'}
              />
            </span>
            <span className="flex min-w-0 flex-1 flex-col items-start">
              <span
                className={`truncate font-label-md text-label-md ${
                  mobileView === 'chat' ? 'font-bold text-primary' : 'text-on-surface'
                }`}
              >
                Drogui
              </span>
              <span className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${droguiPresenceDotClass}`}
                  aria-hidden
                />
                <span className="truncate">{droguiPresenceLabel}</span>
              </span>
            </span>
          </button>

          {mobileView === 'chat' && healthStatus === 'healthy' ? (
            <button
              type="button"
              onClick={startNewConversation}
              className="flex shrink-0 items-center self-center px-sm text-primary"
              aria-label="Nueva conversación"
              title="Nueva conversación"
            >
              <Icon name="add_comment" size={22} />
            </button>
          ) : null}

          {mobileView === 'chat' && healthStatus === 'unhealthy' ? (
            <button
              type="button"
              onClick={() => {
                setHealthStatus('checking')
                void checkHealth()
              }}
              className="flex shrink-0 items-center self-center px-sm text-error"
              aria-label="Reintentar conexión"
              title="Reintentar"
            >
              <Icon name="refresh" size={22} />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          role="tab"
          aria-selected={mobileView === 'summary'}
          onClick={() => setMobileView('summary')}
          className={`flex shrink-0 items-center justify-center border-l border-outline-variant px-lg py-sm font-label-md text-label-md transition-colors ${
            mobileView === 'summary'
              ? 'border-b-2 border-primary font-bold text-primary'
              : 'text-on-surface-variant'
          }`}
        >
          Resumen
        </button>
      </div>

      <section
        className={`relative flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-container-lowest dark:bg-background ${
          mobileView !== 'chat' ? 'hidden lg:flex' : ''
        }`}
      >
        {resumeCheckoutBanner && (
          <div
            role="status"
            className="z-20 flex shrink-0 items-center gap-sm border-b border-primary/30 bg-primary-container/20 px-lg py-sm font-body-sm text-body-sm text-on-surface"
          >
            <Icon name="shopping_cart_checkout" size={18} className="shrink-0 text-primary" />
            <span className="flex-1">
              Sesión iniciada. Tu carrito sigue aquí — confirma la compra cuando estés listo.
            </span>
            <button
              type="button"
              onClick={() => setResumeCheckoutBanner(false)}
              className="shrink-0 rounded px-sm py-xs font-label-md text-label-md text-primary hover:bg-primary/10"
            >
              Cerrar
            </button>
          </div>
        )}

        {guestCheckoutLocked && (
          <div
            role="alert"
            className="z-20 flex shrink-0 items-center gap-sm border-b border-primary/30 bg-primary-container/20 px-lg py-sm font-body-sm text-body-sm text-on-surface"
          >
            <Icon name="lock" size={18} className="shrink-0 text-primary" />
            <span className="flex-1">{CHECKOUT_AUTH_MESSAGE}</span>
            <button
              type="button"
              onClick={redirectToCheckoutLogin}
              className="shrink-0 rounded border border-primary/40 px-sm py-xs font-label-md text-label-md text-primary transition-colors hover:bg-primary/10"
            >
              Iniciar sesión
            </button>
          </div>
        )}

        <div
          role="status"
          aria-live="polite"
          className="z-20 hidden shrink-0 items-center gap-sm border-b border-outline-variant bg-surface px-lg py-sm lg:flex"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <Icon name="smart_toy" size={20} className="text-primary" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col items-start">
            <span className="truncate font-label-md text-label-md font-bold text-on-surface">
              Drogui
            </span>
            <span className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${droguiPresenceDotClass}`}
                aria-hidden
              />
              <span className="truncate">{droguiPresenceLabel}</span>
            </span>
          </span>

          {healthStatus === 'healthy' ? (
            <button
              type="button"
              onClick={startNewConversation}
              className="flex shrink-0 items-center px-sm text-primary transition-colors hover:bg-primary/10"
              aria-label="Nueva conversación"
              title="Nueva conversación"
            >
              <Icon name="add_comment" size={22} />
            </button>
          ) : null}

          {healthStatus === 'unhealthy' ? (
            <button
              type="button"
              onClick={() => {
                setHealthStatus('checking')
                void checkHealth()
              }}
              className="flex shrink-0 items-center px-sm text-error transition-colors hover:bg-error/10"
              aria-label="Reintentar conexión"
              title="Reintentar"
            >
              <Icon name="refresh" size={22} />
            </button>
          ) : null}
        </div>

        <div
          ref={messagesContainerRef}
          className="custom-scrollbar z-10 flex flex-1 flex-col gap-lg overflow-y-auto p-md pt-sm lg:p-lg"
        >
          {!historyLoaded && (
            <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
              Cargando conversación…
            </p>
          )}
          {messages.map((msg) => (
            <ChatMessageComponent
              key={msg.id}
              message={msg}
              onChipClick={handleChipClick}
              onProductClick={handleProductClick}
              chipsDisabled={!chatAvailable}
            />
          ))}
          {isTyping && <TypingIndicator />}
        </div>

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => void sendMessage(input)}
          disabled={!chatAvailable || !historyLoaded}
        />

        <ChatHelpFab
          onClick={() => setTutorialOpen(true)}
          visible={mobileView === 'chat' && !tutorialOpen}
        />
      </section>

      <PurchaseTutorialPanel open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      <OperationSummary
        className={
          mobileView === 'chat' ? 'hidden min-h-0 lg:flex lg:shrink-0' : 'flex min-h-0 flex-1 lg:shrink-0'
        }
        summary={operationSummary}
        chatState={chatState}
        invoiceNumber={invoiceNumber}
        fulfillmentStatus={fulfillmentStatus}
        onConfirm={handleConfirmPurchase}
        onModify={() => void sendMessage('Quiero modificar el pedido.')}
        onCancel={() => void sendMessage('cancelar')}
      />
    </div>
  )
}
