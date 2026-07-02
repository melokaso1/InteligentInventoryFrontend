import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { ChatMessage } from '../types'
import {
  fetchChatHealth,
  getChatSessionId,
  sendChatMessage,
  type ChatOperationSummary,
} from '../api'
import { ApiError } from '../api/client'
import { ChatMessage as ChatMessageComponent, TypingIndicator } from '../components/chat/ChatMessage'
import { ChatInput } from '../components/chat/ChatInput'
import { OperationSummary } from '../components/chat/OperationSummary'
import { Icon } from '../components/ui/Icon'

type MobileView = 'chat' | 'summary'
type HealthStatus = 'checking' | 'healthy' | 'unhealthy'

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    '¡Hola! Soy el asistente de El Plonsazo. Puedo ayudarte a consultar stock, buscar productos y realizar compras. ¿En qué te puedo ayudar?',
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  chips: ['Consultar stock', 'Buscar producto', 'Ver ofertas'],
}

const CHIP_INTENT_MESSAGES: Record<string, string> = {
  'Consultar stock': 'consultar stock',
  'Buscar producto': 'buscar producto',
  'Ver ofertas': 'ver ofertas',
  'Nueva consulta': 'nueva consulta',
  'Cancelar': 'cancelar',
}

function getChatErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 502) {
      return 'No se pudo conectar con la API (.NET). Inicia el backend en el puerto 5151.'
    }
    if (err.status === 503) {
      return 'El chatbot FastAPI no está disponible. Ejecuta: cd LLMChatBot && python run.py'
    }
    if (err.status === 401) {
      return 'Sesión expirada. Vuelve a iniciar sesión.'
    }
    return err.message || 'No pude procesar tu mensaje. Inténtalo de nuevo.'
  }
  return 'No pude conectar con el servicio de chat. Verifica que la API .NET y el chatbot FastAPI estén en ejecución.'
}

function getHealthBannerMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 502) {
      return 'API no disponible — inicia el backend .NET en el puerto 5151 (cd Backend/Api && dotnet run).'
    }
    if (err.status === 503) {
      return 'Chatbot no disponible — levanta FastAPI en :8000 (cd LLMChatBot && python run.py).'
    }
  }
  return 'Chatbot no disponible — verifica que la API .NET y FastAPI estén en ejecución.'
}

export function ChatbotPage() {
  const location = useLocation()
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [mobileView, setMobileView] = useState<MobileView>('chat')
  const [operationSummary, setOperationSummary] = useState<ChatOperationSummary | null>(null)
  const [chatState, setChatState] = useState('idle')
  const [invoiceNumber, setInvoiceNumber] = useState<string | undefined>()
  const [sessionId] = useState(() => getChatSessionId())
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('checking')
  const [healthBanner, setHealthBanner] = useState('')
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const scrollBehaviorRef = useRef<ScrollBehavior>('smooth')
  const sentInitialForKey = useRef<string | null>(null)
  const requestSeq = useRef(0)
  const latestRequestIdRef = useRef(0)
  const lastCancelSentAtRef = useRef(0)

  const chatAvailable = healthStatus === 'healthy'

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
    if (!normalizedText || !chatAvailable) return

    const isCancel = /cancelar|cancel/i.test(normalizedText)

    // Avoid dropping cancel actions even if a request is currently in-flight.
    if (isTyping && !isCancel) return

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
      }
      setMessages((prev) => [...prev, botMsg])
      setChatState(result.state)
      setOperationSummary(result.operationSummary ?? null)
      setInvoiceNumber(result.invoiceNumber)
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
    if (!initialMessage || sentInitialForKey.current === location.key || !chatAvailable) return
    sentInitialForKey.current = location.key
    void sendMessage(initialMessage)
  }, [location.key, location.state, chatAvailable])

  const handleChipClick = (chip: string) => {
    if (!chatAvailable) return
    if (chip.toLowerCase().includes('confirmar') || chip.toLowerCase().includes('confirm')) {
      void sendMessage('Sí, confirmo la compra.')
    } else if (chip.toLowerCase().includes('cancelar') || chip.toLowerCase().includes('cancel')) {
      void sendMessage('cancelar')
    } else {
      void sendMessage(CHIP_INTENT_MESSAGES[chip] ?? chip)
    }
  }

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
          {messages.map((msg) => (
            <ChatMessageComponent
              key={msg.id}
              message={msg}
              onChipClick={handleChipClick}
              chipsDisabled={!chatAvailable}
            />
          ))}
          {isTyping && <TypingIndicator />}
        </div>

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => void sendMessage(input)}
          disabled={!chatAvailable}
        />
      </section>

      <OperationSummary
        className={
          mobileView === 'chat' ? 'hidden min-h-0 lg:flex lg:shrink-0' : 'flex min-h-0 flex-1 lg:shrink-0'
        }
        summary={operationSummary}
        chatState={chatState}
        invoiceNumber={invoiceNumber}
        onConfirm={() => void sendMessage('Sí, confirmo la compra.')}
        onModify={() => void sendMessage('Quiero modificar el pedido.')}
        onCancel={() => void sendMessage('cancelar')}
      />
    </div>
  )
}
