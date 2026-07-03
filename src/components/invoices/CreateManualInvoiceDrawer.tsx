import { useEffect, useMemo, useState } from 'react'
import type { Invoice, Product } from '../../types'
import { createManualInvoice, fetchProducts } from '../../api'
import { Drawer } from '../ui/Drawer'
import { Icon } from '../ui/Icon'
import { formatCOP } from '../../utils/format'

const TAX_RATE = 0.08

interface DraftLineItem {
  productId: string
  code: string
  name: string
  quantity: number
  unitPrice: number
}

interface CreateManualInvoiceDrawerProps {
  open: boolean
  creating: boolean
  onClose: () => void
  onCreatingChange: (creating: boolean) => void
  onCreated: (invoice: Invoice) => void
  onError: (message: string) => void
}

export function CreateManualInvoiceDrawer({
  open,
  creating,
  onClose,
  onCreatingChange,
  onCreated,
  onError,
}: CreateManualInvoiceDrawerProps) {
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [billingNote, setBillingNote] = useState('')
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const controller = new AbortController()

    async function loadProducts() {
      setProductsLoading(true)
      try {
        const result = await fetchProducts({ pageSize: 100, q: productSearch || undefined }, controller.signal)
        if (!cancelled) {
          setProducts(result.items.filter((p) => p.status === 'active' || p.status === 'out_of_stock'))
        }
      } catch {
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) setProductsLoading(false)
      }
    }

    const timeout = window.setTimeout(() => void loadProducts(), productSearch ? 250 : 0)
    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [open, productSearch])

  useEffect(() => {
    if (!open) {
      setCustomerName('')
      setCustomerEmail('')
      setBillingNote('')
      setLineItems([])
      setProductSearch('')
    }
  }, [open])

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [lineItems],
  )
  const tax = useMemo(() => Math.round(subtotal * TAX_RATE * 100) / 100, [subtotal])
  const total = useMemo(() => subtotal + tax, [subtotal, tax])

  const addProduct = (product: Product) => {
    setLineItems((items) => {
      const existing = items.find((item) => item.productId === product.id)
      if (existing) {
        return items.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [
        ...items,
        {
          productId: product.id,
          code: product.code,
          name: product.name,
          quantity: 1,
          unitPrice: product.price,
        },
      ]
    })
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      setLineItems((items) => items.filter((item) => item.productId !== productId))
      return
    }
    setLineItems((items) =>
      items.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
    )
  }

  const removeLine = (productId: string) => {
    setLineItems((items) => items.filter((item) => item.productId !== productId))
  }

  const handleCreate = async () => {
    if (creating) return
    if (lineItems.length === 0) {
      onError('Agrega al menos un producto a la factura.')
      return
    }

    onCreatingChange(true)
    try {
      const invoice = await createManualInvoice({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        billingNote: billingNote.trim() || undefined,
        lineItems: lineItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      })
      onCreated(invoice)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo crear la factura.')
    } finally {
      onCreatingChange(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Crear factura manual"
      subtitle="Selecciona productos del catálogo y confirma el total"
      footer={
        <div className="flex flex-col gap-md">
          <div className="space-y-sm rounded-lg border border-outline-variant bg-surface-container-low p-md text-body-sm">
            <div className="flex justify-between text-on-surface">
              <span>Subtotal</span>
              <span className="font-mono-sm">{formatCOP(subtotal)}</span>
            </div>
            <div className="flex justify-between text-on-surface">
              <span>IVA (8%)</span>
              <span className="font-mono-sm">{formatCOP(tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-headline-sm text-on-surface">
              <span>Total</span>
              <span className="font-mono-sm text-primary">{formatCOP(total)}</span>
            </div>
          </div>
          <div className="flex gap-md">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="flex-1 rounded-lg border border-outline-variant py-2 font-label-md text-label-md disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating || lineItems.length === 0}
              className="flex-1 rounded-lg bg-primary py-2 font-label-md text-label-md text-on-primary disabled:opacity-50"
            >
              {creating ? 'Creando…' : 'Crear factura'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-lg">
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase text-on-surface-variant">
              Cliente (opcional)
            </label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Nombre del cliente"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-on-surface-variant">
              Correo (opcional)
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="cliente@correo.com"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-on-surface-variant">
            Buscar producto
          </label>
          <input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Nombre o código SKU"
          />
          <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-outline-variant">
            {productsLoading ? (
              <p className="p-md text-body-sm text-on-surface-variant">Cargando productos…</p>
            ) : products.length === 0 ? (
              <p className="p-md text-body-sm text-on-surface-variant">No hay productos disponibles.</p>
            ) : (
              products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProduct(product)}
                  className="flex w-full items-center justify-between gap-sm border-b border-outline-variant/30 px-md py-sm text-left transition-colors last:border-0 hover:bg-surface-container-high"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body-md text-on-surface">{product.name}</p>
                    <p className="text-body-sm text-on-surface-variant">{product.code}</p>
                  </div>
                  <span className="shrink-0 font-mono-sm text-primary">{formatCOP(product.price)}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-on-surface-variant">Líneas de factura</p>
          {lineItems.length === 0 ? (
            <p className="rounded-lg border border-dashed border-outline-variant px-md py-lg text-center text-body-sm text-on-surface-variant">
              Agrega productos desde la lista de arriba.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-outline-variant">
              <table className="w-full min-w-[480px] text-left text-body-sm">
                <thead className="bg-surface-container">
                  <tr>
                    <th className="px-md py-2 font-label-md text-label-md uppercase text-on-surface-variant">
                      Producto
                    </th>
                    <th className="px-md py-2 text-center font-label-md text-label-md uppercase text-on-surface-variant">
                      Cant.
                    </th>
                    <th className="px-md py-2 text-right font-label-md text-label-md uppercase text-on-surface-variant">
                      Precio
                    </th>
                    <th className="px-md py-2 text-right font-label-md text-label-md uppercase text-on-surface-variant">
                      Subtotal
                    </th>
                    <th className="px-md py-2" aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {lineItems.map((item) => (
                    <tr key={item.productId}>
                      <td className="px-md py-2">
                        <p className="font-medium text-on-surface">{item.name}</p>
                        <p className="text-body-sm text-on-surface-variant">{item.code}</p>
                      </td>
                      <td className="px-md py-2 text-center">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                          className="w-16 rounded border border-outline-variant bg-surface-container-lowest px-2 py-1 text-center text-on-surface"
                        />
                      </td>
                      <td className="px-md py-2 text-right font-mono-sm">{formatCOP(item.unitPrice)}</td>
                      <td className="px-md py-2 text-right font-mono-sm font-semibold">
                        {formatCOP(item.unitPrice * item.quantity)}
                      </td>
                      <td className="px-md py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeLine(item.productId)}
                          className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-error"
                          aria-label="Quitar producto"
                        >
                          <Icon name="delete" size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-on-surface-variant">Nota (opcional)</label>
          <textarea
            value={billingNote}
            onChange={(e) => setBillingNote(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-none rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Notas de facturación"
          />
        </div>
      </div>
    </Drawer>
  )
}
