import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'
import {
  getChatSessionId,
  sendChatMessage,
  type ChatOperationSummary,
} from '../api'
import { ChatMessage as ChatMessageComponent, TypingIndicator } from '../components/chat/ChatMessage'
import { ChatInput } from '../components/chat/ChatInput'
import { OperationSummary } from '../components/chat/OperationSummary'

type MobileView = 'chat' | 'summary'

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    '¡Hola! Soy el asistente de El Plonsazo. Puedo ayudarte a consultar stock, buscar productos y realizar compras. ¿En qué te puedo ayudar?',
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  chips: ['Consultar stock', 'Buscar producto', 'Ver ofertas'],
}

export function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [mobileView, setMobileView] = useState<MobileView>('chat')
  const [operationSummary, setOperationSummary] = useState<ChatOperationSummary | null>(null)
  const [chatState, setChatState] = useState('idle')
  const [invoiceNumber, setInvoiceNumber] = useState<string | undefined>()
  const [sessionId] = useState(() => getChatSessionId())
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const scrollBehaviorRef = useRef<ScrollBehavior>('smooth')

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
    if (!text.trim() || isTyping) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    scrollBehaviorRef.current = 'auto'
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const result = await sendChatMessage(sessionId, text.trim())
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
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content:
            'No pude conectar con el servicio de chat. Verifica que la API .NET y el chatbot FastAPI estén en ejecución.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleChipClick = (chip: string) => {
    if (chip.toLowerCase().includes('confirmar') || chip.toLowerCase().includes('confirm')) {
      void sendMessage('Sí, confirmo la compra.')
    } else if (chip.toLowerCase().includes('cancelar') || chip.toLowerCase().includes('cancel')) {
      void sendMessage('Cancelar la solicitud.')
    } else {
      void sendMessage(chip)
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
        <div
          ref={messagesContainerRef}
          className="custom-scrollbar z-10 flex flex-1 flex-col gap-lg overflow-y-auto p-lg"
        >
          {messages.map((msg) => (
            <ChatMessageComponent key={msg.id} message={msg} onChipClick={handleChipClick} />
          ))}
          {isTyping && <TypingIndicator />}
        </div>

        <ChatInput value={input} onChange={setInput} onSend={() => void sendMessage(input)} />
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
        onCancel={() => void sendMessage('Cancelar la solicitud.')}
      />
    </div>
  )
}
