import { Icon } from '../ui/Icon'

interface ChatHelpFabProps {
  onClick: () => void
  visible?: boolean
}

export function ChatHelpFab({ onClick, visible = true }: ChatHelpFabProps) {
  if (!visible) {
    return null
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir guía de compra"
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-md z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-xl transition-transform hover:scale-105 active:scale-95 sm:right-lg lg:bottom-lg"
    >
      <Icon name="help" size={28} />
    </button>
  )
}
