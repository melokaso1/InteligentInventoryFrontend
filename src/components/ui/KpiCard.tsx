interface KpiCardProps {
  label: string
  value: string
  change: string
  changeType?: 'positive' | 'negative' | 'warning' | 'neutral'
  icon: string
  iconBg?: string
  iconColor?: string
}

export function KpiCard({
  label,
  value,
  change,
  changeType = 'positive',
  icon,
  iconBg = 'bg-primary/10',
  iconColor = 'text-primary',
}: KpiCardProps) {
  const changeColors = {
    positive: 'text-primary',
    negative: 'text-error',
    warning: 'text-error',
    neutral: 'text-primary',
  }

  return (
    <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between">
      <div className="flex justify-between items-start mb-md">
        <span className={`material-symbols-outlined ${iconColor} ${iconBg} p-2 rounded-lg`}>
          {icon}
        </span>
        <span className={`font-label-md text-label-md flex items-center ${changeColors[changeType]}`}>
          {change}
        </span>
      </div>
      <div>
        <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-xs">
          {label}
        </p>
        <h3 className="font-display-lg text-display-lg text-on-surface">{value}</h3>
      </div>
    </div>
  )
}
