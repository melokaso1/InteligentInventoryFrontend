import { reportItems } from '../data/mock'
import { Icon } from '../components/ui/Icon'
import { PrimaryActionButton } from '../components/ui/PrimaryActionButton'

export function ReportsPage() {
  return (
    <div className="space-y-xl">
      <div className="flex flex-col gap-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface">Informes</h1>
          <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
            Genera y exporta reportes del sistema. Los datos mostrados son de demostración.
          </p>
        </div>
        <PrimaryActionButton size="compact">Nuevo informe personalizado</PrimaryActionButton>
      </div>

      <section className="grid grid-cols-1 gap-lg md:grid-cols-3">
        {[
          { label: 'Informes generados', value: '24', icon: 'description', color: 'text-primary' },
          { label: 'Descargas este mes', value: '156', icon: 'download', color: 'text-primary-dim' },
          { label: 'Programados', value: '3', icon: 'schedule', color: 'text-tertiary' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm"
          >
            <div className={`rounded-lg bg-primary/10 p-sm ${stat.color}`}>
              <Icon name={stat.icon} />
            </div>
            <div>
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">{stat.label}</p>
              <p className="font-display-lg text-display-lg">{stat.value}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="border-b border-outline-variant bg-surface-container-low px-lg py-md">
          <h2 className="font-headline-sm text-headline-sm">Informes disponibles</h2>
        </div>
        <div className="divide-y divide-outline-variant/30">
          {reportItems.map((report) => (
            <div
              key={report.id}
              className="flex flex-col gap-md p-lg transition-colors hover:bg-surface-container-low/50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-md">
                <div className="rounded-lg bg-primary-container p-sm text-on-primary-container">
                  <Icon name={report.icon} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-sm">
                    <h3 className="font-body-md font-bold text-on-surface">{report.name}</h3>
                    <span className="rounded bg-surface-container-high px-sm py-[2px] font-label-md text-[10px] uppercase text-on-surface-variant">
                      {report.category}
                    </span>
                  </div>
                  <p className="mt-xs font-body-sm text-body-sm text-on-surface-variant">
                    {report.description}
                  </p>
                  <p className="mt-xs font-mono-sm text-[11px] text-outline">
                    Última generación: {report.lastGenerated} · {report.format}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-sm">
                <button
                  type="button"
                  className="inline-flex items-center gap-xs rounded-lg border border-outline-variant px-md py-xs font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
                >
                  <Icon name="visibility" size={16} />
                  Vista previa
                </button>
                <PrimaryActionButton size="sm" icon="download">
                  Exportar
                </PrimaryActionButton>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
