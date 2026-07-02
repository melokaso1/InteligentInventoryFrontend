type LogoSize = 'sm' | 'md' | 'lg' | number

interface LogoProps {
  size?: LogoSize
  showText?: boolean
  className?: string
  textClassName?: string
  iconClassName?: string
}

const SIZE_HEIGHT: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
}

function resolveHeightClass(size: LogoSize): string {
  if (typeof size === 'string') return SIZE_HEIGHT[size]
  if (size <= 28) return SIZE_HEIGHT.sm
  if (size <= 40) return SIZE_HEIGHT.md
  return SIZE_HEIGHT.lg
}

function LogoImage({ size, className }: { size: LogoSize; className?: string }) {
  return (
    <img
      src="/Logo.png"
      alt="El Plonsazo"
      className={`w-auto shrink-0 object-contain ${resolveHeightClass(size)} ${className ?? ''}`.trim()}
    />
  )
}

export function Logo({
  size = 'md',
  showText = false,
  className = '',
  textClassName = '',
  iconClassName = '',
}: LogoProps) {
  if (!showText) {
    return <LogoImage size={size} className={iconClassName} />
  }

  return (
    <div className={`flex items-center gap-sm ${className}`}>
      <LogoImage size={size} className={iconClassName} />
      <span className={`font-headline-md text-headline-md font-bold leading-tight ${textClassName}`}>
        El Plonsazo
      </span>
    </div>
  )
}
