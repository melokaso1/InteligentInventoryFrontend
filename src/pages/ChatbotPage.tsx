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
import { getCurrentUser, isAdmin } from '../hooks/useAuth'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { notifyDataMutation } from '../utils/dataSync'
import { ChatMessage as ChatMessageComponent, TypingIndicator } from '../components/chat/ChatMessage'
import { ChatInput } from '../components/chat/ChatInput'
import { OperationSummary } from '../components/chat/OperationSummary'
import { PurchaseTutorialPanel } from '../components/chat/PurchaseTutorialPanel'
import { Icon } from '../components/ui/Icon'
import { PageHelpCard } from '../components/ui/PageHelpCard'

type MobileView = 'chat' | 'summary'
type HealthStatus = 'checking' | 'healthy' | 'unhealthy'

const TUTORIAL_DESKTOP_KEY_ADMIN = 'plonsazo-chat-tutorial-open'
const TUTORIAL_DESKTOP_KEY_CLIENTE = 'plonsazo-chat-tutorial-open-cliente'

function getTutorialDesktopStorageKey() {
  return isAdmin() ? TUTORIAL_DESKTOP_KEY_ADMIN : TUTORIAL_DESKTOP_KEY_CLIENTE
}

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

function getHealthBannerMessage(err: unknown): string {
  return getUserFacingApiError(err, 'El asistente no está disponible en este momento. Intenta de nuevo más tarde.', 'chat')
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
  const [healthBanner, setHealthBanner] = useState('')
  const [tutorialDesktopOpen, setTutorialDesktopOpen] = useState(
    () => localStorage.getItem(getTutorialDesktopStorageKey()) !== 'false',
  )
  const [tutorialMobileOpen, setTutorialMobileOpen] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const scrollBehaviorRef = useRef<ScrollBehavior>('smooth')
  const sentInitialForKey = useRef<string | null>(null)
  const requestSeq = useRef(0)
  const latestRequestIdRef = useRef(0)
  const lastCancelSentAtRef = useRef(0)

  const chatAvailable = healthStatus === 'healthy'

  const loadLatestFulfillment = useCallback(async (force = false) => {
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

  const checkHealth = useCallback(async () => {
    try {
      await fetchChatHealth()
      setHealthStatus('healthy')
      setHealthBanner('')
    } catch (err) {
      setHealthStatus('unhealthy')
      setHealthBanner(getHealthBannerMessage(err))
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
      navigate(isAdmin() ? '/invoices' : '/my-invoices')
      return
    }
    void sendMessage(CHIP_INTENT_MESSAGES[chip] ?? chip)
  }

  const handleProductClick = (productCode: string) => {
    if (!chatAvailable) return
    void sendMessage(productCode)
  }

  const closeTutorialDesktop = () => {
    setTutorialDesktopOpen(false)
    localStorage.setItem(getTutorialDesktopStorageKey(), 'false')
  }

  const openTutorialDesktop = () => {
    setTutorialDesktopOpen(true)
    localStorage.setItem(getTutorialDesktopStorageKey(), 'true')
  }

  const openTutorialMobile = () => {
    setTutorialMobileOpen(true)
  }

  const clienteUser = !isAdmin()

  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-hidden lg:flex-row">
      <div
        role="tablist"
        aria-label="Vista del chatbot"
        className="flex shrink-0 border-b border-outline-variant bg-surface lg:hidden"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === 'chat'}
          onClick={() => setMobileView('chat')}
          className={`flex-1 py-md font-label-md text-label-md transition-colors ${
            mobileView === 'chat'
              ? 'border-b-2 border-primary font-bold text-primary'
              : 'text-on-surface-variant'
          }`}
        >
          Chat
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === 'summary'}
          onClick={() => setMobileView('summary')}
          className={`flex-1 py-md font-label-md text-label-md transition-colors ${
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
        {healthStatus === 'healthy' && (
          <div
            role="status"
            className="z-20 flex shrink-0 items-center gap-sm border-b border-primary/20 bg-primary/5 px-lg py-sm font-body-sm text-body-sm text-on-surface-variant"
          >
            <Icon name="smart_toy" size={18} className="shrink-0 text-primary" />
            <span className="flex-1">
              Drogui está en línea — escribe en lenguaje natural o elige una opción del menú.
            </span>
            <button
              type="button"
              onClick={startNewConversation}
              className="shrink-0 rounded border border-primary/30 px-sm py-xs font-label-md text-label-md text-primary transition-colors hover:bg-primary/10"
            >
              Nueva conversación
            </button>
          </div>
        )}

        {clienteUser ? (
          <PageHelpCard
            storageKey="chatbot-client-tip"
            icon="shopping_cart"
            title="¿Cómo comprar con Drogui?"
            className="z-10 shrink-0 px-lg py-sm lg:hidden"
            steps={[
              <>Escribe lo que buscas, por ejemplo: «quiero 2 unidades de marihuana blue».</>,
              <>Elige el producto si hay varias opciones y confirma la cantidad.</>,
              <>Al terminar, revisa tu factura en <strong>Mis facturas</strong> o pídele «ver factura» al chat.</>,
            ]}
            tip={
              <>
                Toca el botón <strong>?</strong> abajo a la derecha para ver la guía completa con ejemplos de comandos.
              </>
            }
          />
        ) : null}

        {healthStatus !== 'healthy' && (
          <div
            role="alert"
            className={`z-20 flex shrink-0 items-center gap-sm border-b px-lg py-sm font-body-sm text-body-sm ${
              healthStatus === 'checking'
                ? 'border-outline-variant bg-surface-container text-on-surface-variant'
                : 'border-error/30 bg-error/10 text-error'
            }`}
          >
            <Icon
              name={healthStatus === 'checking' ? 'hourglass_empty' : 'warning'}
              size={18}
              className="shrink-0"
            />
            <span className="flex-1">
              {healthStatus === 'checking'
                ? 'Comprobando disponibilidad del chatbot…'
                : healthBanner}
            </span>
            {healthStatus === 'unhealthy' && (
              <button
                type="button"
                onClick={() => {
                  setHealthStatus('checking')
                  void checkHealth()
                }}
                className="shrink-0 rounded border border-current px-sm py-xs font-label-md text-label-md transition-colors hover:bg-error/10"
              >
                Reintentar
              </button>
            )}
          </div>
        )}

        <div
          ref={messagesContainerRef}
          className="custom-scrollbar z-10 flex flex-1 flex-col gap-lg overflow-y-auto p-lg"
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
      </section>

      <PurchaseTutorialPanel
        className={mobileView !== 'chat' ? 'max-lg:hidden' : ''}
        desktopOpen={tutorialDesktopOpen}
        mobileOpen={tutorialMobileOpen}
        onDesktopToggle={openTutorialDesktop}
        onDesktopClose={closeTutorialDesktop}
        onMobileOpen={openTutorialMobile}
        onMobileClose={() => setTutorialMobileOpen(false)}
      />

      <OperationSummary
        className={
          mobileView === 'chat' ? 'hidden min-h-0 lg:flex lg:shrink-0' : 'flex min-h-0 flex-1 lg:shrink-0'
        }
        summary={operationSummary}
        chatState={chatState}
        invoiceNumber={invoiceNumber}
        fulfillmentStatus={fulfillmentStatus}
        onConfirm={() => void sendMessage('Confirmar compra')}
        onModify={() => void sendMessage('Quiero modificar el pedido.')}
        onCancel={() => void sendMessage('cancelar')}
      />
    </div>
  )
}
