import { Icon } from '../ui/Icon'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
}

export function ChatInput({ value, onChange, onSend, disabled = false }: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="z-10 min-w-0 border-t border-outline-variant bg-surface p-md pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-lg sm:pb-lg">
      <div className="flex min-w-0 items-center gap-sm">
        <div className="flex min-w-0 flex-1 items-center gap-sm rounded border border-outline-variant bg-surface-container-low px-md py-sm transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <input
            className="h-11 min-w-0 flex-1 border-none bg-transparent px-0 text-base leading-normal text-on-surface placeholder:text-outline outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Escribe tu respuesta o solicita cambios..."
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={disabled}
            className="flex shrink-0 items-center gap-xs rounded bg-primary px-md py-sm font-label-md text-label-md text-on-primary transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="hidden sm:inline">Enviar</span>
            <Icon name="send" filled size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
