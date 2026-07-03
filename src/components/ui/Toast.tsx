interface ToastProps {
  message: string | null
  onDismiss?: () => void
  className?: string
}

export function Toast({ message, onDismiss, className = '' }: ToastProps) {
  if (!message) return null

  return (
    <div
      className={`flex items-start justify-between gap-sm rounded-lg border border-primary/30 bg-primary-container/20 px-md py-sm text-body-sm text-on-surface ${className}`}
      role="status"
    >
      <span className="flex-1">{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 font-label-md text-label-md text-on-surface-variant hover:text-on-surface"
          aria-label="Cerrar notificación"
        >
          ×
        </button>
      ) : null}
    </div>
  )
}
