import { useTheme } from '../../hooks/useTheme'
import { Icon } from './Icon'

type ThemeToggleProps = {
  variant?: 'floating' | 'inline'
  className?: string
}

export function ThemeToggle({ variant = 'inline', className = '' }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  const variantClasses =
    variant === 'floating'
      ? 'absolute top-4 right-4 z-10 rounded-full bg-surface-container-high p-2 transition-all hover:bg-surface-container-highest active:scale-95'
      : 'rounded-full p-2 text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-primary active:scale-95'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`${variantClasses} ${className}`.trim()}
      title="Cambiar tema"
      aria-label="Cambiar tema"
    >
      <Icon
        name={isDark ? 'light_mode' : 'dark_mode'}
        className={variant === 'floating' ? 'text-on-surface-variant' : undefined}
      />
    </button>
  )
}
