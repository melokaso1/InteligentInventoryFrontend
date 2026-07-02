import { useState } from 'react'
import type { Product } from '../types'
import { products } from '../data/mock'
import { Drawer } from '../components/ui/Drawer'
import { Icon } from '../components/ui/Icon'
import { PrimaryActionButton } from '../components/ui/PrimaryActionButton'
import { Select } from '../components/ui/Select'
import { formatCOP } from '../utils/format'

const avgUnitPrice = Math.round(
  products.reduce((sum, p) => sum + p.price, 0) / products.length,
)

export function ProductsPage() {
  const [selected, setSelected] = useState<Product | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const openDrawer = (product: Product) => {
    setSelected(product)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setSelected(null)
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-lg">
      <div className="mb-xl flex flex-col justify-between gap-gutter md:flex-row md:items-center">
        <div>
          <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2 text-[12px] text-on-surface-variant">
            <span className="cursor-pointer hover:text-primary">Inventario</span>
            <Icon name="chevron_right" size={14} />
            <span className="truncate font-bold text-primary">Datos maestros de productos</span>
          </div>
          <h3 className="font-display-lg text-display-lg text-on-surface">Datos maestros de productos</h3>
          <p className="mt-1 text-on-surface-variant">
            Gestiona configuraciones de productos, modelos de precios y estado global del inventario.
          </p>
        </div>
        <PrimaryActionButton>Añadir producto</PrimaryActionButton>
      </div>

      <div className="mb-xl grid grid-cols-1 gap-md md:grid-cols-4">
        {[
          { label: 'SKU TOTALES', value: '1,284', change: '+12%', icon: 'inventory', tone: 'primary' },
          { label: 'PRODUCTOS ACTIVOS', value: '1,210', change: '94.2%', icon: 'check_circle', tone: 'tertiary' },
          { label: 'ALERTAS STOCK BAJO', value: '14', change: 'Alta prioridad', icon: 'warning', tone: 'error' },
          { label: 'PRECIO MEDIO UNIT.', value: formatCOP(avgUnitPrice), change: '', icon: 'payments', tone: 'secondary' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-2 flex items-start justify-between">
              <div className={`rounded-lg p-2 ${stat.tone === 'error' ? 'bg-error-container/20 text-error' : stat.tone === 'tertiary' ? 'bg-tertiary-container text-tertiary' : stat.tone === 'secondary' ? 'bg-primary-container text-primary' : 'bg-primary/10 text-primary'}`}>
                <Icon name={stat.icon} />
              </div>
              {stat.change && (
                <span className={`text-[12px] font-bold ${stat.tone === 'error' ? 'text-error' : 'text-on-surface-variant'}`}>
                  {stat.change}
                </span>
              )}
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant">{stat.label}</p>
            <p className="text-headline-md font-bold text-on-surface">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-xl flex min-w-0 max-w-full flex-col gap-md overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm md:flex-row md:flex-wrap md:items-center">
        <div className="relative min-w-0 w-full md:min-w-[240px] md:flex-1">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            size={18}
          />
          <input
            className="w-full bg-surface-container-low border border-outline rounded-lg py-2.5 pl-10 pr-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            placeholder="Filtrar por nombre, SKU o descripción..."
            type="text"
          />
        </div>
        <Select className="w-full min-w-0 shrink bg-surface-container-low border border-outline rounded-lg py-2.5 pl-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none md:w-auto">
          <option>Todas las categorías</option>
          <option>Hardware</option>
          <option>Software</option>
          <option>Servicios</option>
        </Select>
        <div className="flex min-w-0 w-full items-center gap-2 md:w-auto">
          <button
            type="button"
            className="flex min-w-0 flex-1 shrink items-center justify-center gap-2 rounded-lg border border-outline px-4 py-2.5 text-on-surface-variant transition-all hover:bg-surface-container hover:text-primary active:scale-95"
          >
            <Icon name="filter_list" size={18} className="shrink-0" />
            <span className="truncate text-body-sm">Más filtros</span>
          </button>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-outline p-2.5 text-on-surface-variant transition-all hover:bg-surface-container"
            title="Exportar"
          >
            <Icon name="file_download" />
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="min-w-0 max-w-full overflow-x-auto">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant">
                <th className="py-4 px-gutter font-label-md text-label-md text-on-surface-variant">PRODUCTO</th>
                <th className="hidden py-4 px-gutter font-label-md text-label-md text-on-surface-variant whitespace-nowrap md:table-cell">
                  CÓDIGO SKU
                </th>
                <th className="hidden py-4 px-gutter font-label-md text-label-md text-on-surface-variant lg:table-cell">
                  CATEGORÍA
                </th>
                <th className="py-4 px-gutter font-label-md text-label-md text-on-surface-variant whitespace-nowrap">
                  PRECIO BASE
                </th>
                <th className="py-4 px-gutter font-label-md text-label-md text-on-surface-variant">ESTADO</th>
                <th className="hidden py-4 px-gutter font-label-md text-label-md text-on-surface-variant text-right sm:table-cell">
                  ACCIONES
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-on-surface">
              {products.slice(0, 6).map((product) => (
                <tr
                  key={product.id}
                  onClick={() => openDrawer(product)}
                  className="hover:bg-primary/5 transition-colors group cursor-pointer"
                >
                  <td className="py-3 px-gutter">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container md:h-12 md:w-12">
                        <Icon name={product.icon} size={22} className="text-on-surface-variant" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-on-surface text-body-md">{product.name}</p>
                        <p className="hidden text-on-surface-variant text-[12px] sm:block">
                          {product.description.slice(0, 40)}…
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-on-surface-variant md:hidden">{product.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap py-3 px-gutter md:table-cell">
                    <span className="inline-block whitespace-nowrap rounded border border-outline-variant bg-surface-container px-2 py-1 font-mono text-xs text-on-surface dark:bg-surface-container-high">
                      {product.code}
                    </span>
                  </td>
                  <td className="hidden py-3 px-gutter lg:table-cell">
                    <span className="inline-flex items-center rounded-full border border-outline-variant/30 bg-surface-container-high px-2 py-0.5 text-[12px] font-semibold text-on-surface">
                      {product.category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-3 px-gutter">
                    <p className="font-bold text-on-surface">{formatCOP(product.price)}</p>
                  </td>
                  <td className="py-3 px-gutter" onClick={(e) => e.stopPropagation()}>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        defaultChecked={product.status === 'active'}
                        readOnly
                      />
                      <div className="w-11 h-6 bg-secondary-fixed-dim rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                    </label>
                  </td>
                  <td className="hidden py-3 px-gutter text-right sm:table-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all" title="Editar">
                        <Icon name="edit" />
                      </button>
                      <button type="button" className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all" title="Duplicar">
                        <Icon name="content_copy" />
                      </button>
                      <button type="button" className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all" title="Eliminar">
                        <Icon name="delete" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="Editar producto"
        subtitle={selected?.code}
        footer={
          <div className="flex gap-md">
            <button
              type="button"
              onClick={closeDrawer}
              className="flex-1 py-2 border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-high"
            >
              Cancelar
            </button>
            <button
              type="button"
              className="flex-1 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90"
            >
              Guardar cambios
            </button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-lg">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase">Nombre del producto</label>
              <input
                defaultValue={selected.name}
                className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase">Categoría</label>
              <input
                defaultValue={selected.category}
                className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase">Precio</label>
                <input
                  defaultValue={selected.price}
                  type="number"
                  className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase">Stock</label>
                <input
                  defaultValue={selected.stock}
                  type="number"
                  className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase">Descripción</label>
              <textarea
                defaultValue={selected.description}
                rows={3}
                className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
