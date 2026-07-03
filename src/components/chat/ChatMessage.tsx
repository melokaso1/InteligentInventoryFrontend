import type { ReactNode } from 'react'
import type { ChatMessage as ChatMessageType } from '../../types'
import { Icon } from '../ui/Icon'
import { ProductOfferList } from './ProductOfferList'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatAssistantContent(content: string): ReactNode[] {
  const paragraphs = content.split(/\n{2,}/)
  const nodes: ReactNode[] = []

  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (paragraphIndex > 0) {
      nodes.push(<br key={`br-${paragraphIndex}`} />)
      nodes.push(<br key={`br2-${paragraphIndex}`} />)
    }

    const lines = paragraph.split('\n')
    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        nodes.push(<br key={`line-${paragraphIndex}-${lineIndex}`} />)
      }
      nodes.push(...formatInlineMarkdown(line, `${paragraphIndex}-${lineIndex}`))
    })
  })

  return nodes.length > 0 ? nodes : [escapeHtml(content)]
}

function formatInlineMarkdown(content: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = []
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escapeHtml(content.slice(lastIndex, match.index)))
    }
    if (match[1] !== undefined) {
      parts.push(<strong key={`${keyPrefix}-${key++}`}>{escapeHtml(match[1])}</strong>)
    } else if (match[2] !== undefined) {
      parts.push(<em key={`${keyPrefix}-${key++}`}>{escapeHtml(match[2])}</em>)
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < content.length) {
    parts.push(escapeHtml(content.slice(lastIndex)))
  }

  return parts.length > 0 ? parts : [escapeHtml(content)]
}

interface ChatMessageProps {
  message: ChatMessageType
  onChipClick?: (chip: string) => void
  onProductClick?: (productCode: string) => void
  chipsDisabled?: boolean
}

function chipStyles(chip: string) {
  const lower = chip.toLowerCase()
  if (lower.includes('confirm') || lower.includes('confirmar')) {
    return 'bg-primary text-on-primary hover:opacity-90 shadow-md'
  }
  if (lower.includes('cancel') || lower.includes('cancelar')) {
    return 'border border-error text-error hover:bg-error/10'
  }
  return 'bg-surface-container-high text-on-surface border border-outline-variant hover:bg-surface-bright'
}

export function ChatMessage({
  message,
  onChipClick,
  onProductClick,
  chipsDisabled = false,
}: ChatMessageProps) {
  if (message.role === 'user') {
    return (
      <div className="flex max-w-[85%] flex-row-reverse gap-md self-end">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary">
          <Icon name="person" filled size={16} className="text-on-primary" />
        </div>
        <div className="flex flex-col items-end gap-xs">
          <div className="rounded-xl rounded-br-[2px] bg-primary-container p-md text-on-primary-container shadow-sm">
            <p className="text-body-md">{message.content}</p>
          </div>
          <span className="px-sm font-mono-sm text-[10px] uppercase text-outline">{message.time}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex max-w-[85%] gap-md">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-outline-variant bg-surface-container-highest">
        <Icon name="smart_toy" filled size={16} className="text-primary" />
      </div>
      <div className="flex max-w-full flex-col gap-sm">
        <div className="flex flex-col gap-xs">
          <div className="rounded-xl rounded-bl-[2px] border border-outline-variant bg-surface-container-low p-md text-on-surface shadow-sm">
            <div className="text-body-md">{formatAssistantContent(message.content)}</div>
            {message.offers && message.offers.length > 0 && (
              <ProductOfferList
                offers={message.offers}
                totalCount={message.offersTotalCount}
                onProductClick={
                  onProductClick
                    ? (offer) => onProductClick(offer.productCode)
                    : undefined
                }
              />
            )}
          </div>
          <span className="px-sm font-mono-sm text-[10px] uppercase text-outline">{message.time}</span>
        </div>
        {message.chips && message.chips.length > 0 && (
          <div className="flex flex-wrap gap-sm">
            {message.chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onChipClick?.(chip)}
                disabled={chipsDisabled}
                className={`rounded px-md py-sm font-label-md text-label-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${chipStyles(chip)}`}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex max-w-[85%] gap-md opacity-80">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-outline-variant bg-surface-container-highest">
        <Icon name="smart_toy" filled size={16} className="text-primary" />
      </div>
      <div className="flex items-center gap-1 rounded-xl rounded-bl-[2px] border border-outline-variant bg-surface-container-low px-md py-sm">
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant" />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant [animation-delay:0.2s]" />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant [animation-delay:0.4s]" />
      </div>
    </div>
  )
}
