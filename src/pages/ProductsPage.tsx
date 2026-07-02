import { useCallback, useEffect, useRef, useState } from 'react'
import type { Product } from '../types'
import { ApiError } from '../api/client'
import {
  createProduct,
  deleteProduct,
  duplicateProduct,
  fetchProductCategories,
  fetchProducts,
  fetchProductStats,
  updateProduct,
} from '../api'
import { Drawer } from '../components/ui/Drawer'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import {
  PaginationControls,
  PaginationFooter,
  PaginationIconButton,
  PaginationInfo,
  PaginationPageButton,
} from '../components/ui/Pagination'
import { PrimaryActionButton } from '../components/ui/PrimaryActionButton'
import { Select } from '../components/ui/Select'
import { formatCOP } from '../utils/format'

const emptyProductForm = {
  code: '',
  name: '',
  category: 'Hardware',
  price: '0',
  stock: '0',
  maxStock: '100',
  description: '',
}

function productToForm(product: Product) {
  return {
    code: product.code,
    name: product.name,
    category: product.category,
    price: String(product.price),
    stock: String(product.stock),
    maxStock: String(product.maxStock),
    description: product.description,
  }
}

const PAGE_SIZE = 15

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    outOfStockProducts: 0,
    totalInventoryValue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [selected, setSelected] = useState<Product | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addDrawerOpen, setAddDrawerOpen] = useState(false)
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [editForm, setEditForm] = useState(emptyProductForm)
  const [submitting, setSubmitting] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const isInitialLoad = useRef(true)
  const productsRequestId = useRef(0)

  const loadSummary = useCallback(async () => {
    const statsResult = await fetchProductStats()
    setStats(statsResult)
  }, [])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, categoryFilter])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function loadCategories() {
      try {
        const result = await fetchProductCategories(controller.signal)
        if (!cancelled) setCategories(result)
      } catch {
        // Dropdown can stay empty if categories fail to load.
      }
    }

    void loadCategories()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const requestId = ++productsRequestId.current

    async function loadProducts() {
      if (!isInitialLoad.current) setRefreshing(true)

      try {
        const result = await fetchProducts(
          {
            q: debouncedSearch || undefined,
            category: categoryFilter || undefined,
            page,
            pageSize: PAGE_SIZE,
          },
          controller.signal,
        )
        if (requestId !== productsRequestId.current) return
        setProducts(result.items)
        setTotalCount(result.totalCount)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (requestId !== productsRequestId.current) return
        // Keep current rows if a non-abort error occurs.
      } finally {
        if (requestId !== productsRequestId.current) return
        if (isInitialLoad.current) {
          isInitialLoad.current = false
          setLoading(false)
        }
        setRefreshing(false)
      }
    }

    void loadProducts()
    return () => {
      controller.abort()
    }
  }, [debouncedSearch, categoryFilter, page])

  const avgUnitPrice =
    stats.totalProducts > 0 ? Math.round(stats.totalInventoryValue / stats.totalProducts) : 0

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount)

  const loadProducts = useCallback(async () => {
    const result = await fetchProducts(
      {
        q: debouncedSearch || undefined,
        category: categoryFilter || undefined,
        page,
        pageSize: PAGE_SIZE,
      },
    )
    setProducts(result.items)
    setTotalCount(result.totalCount)
  }, [debouncedSearch, categoryFilter, page])

  const openDrawer = (product: Product) => {
    setSelected(product)
    setEditForm(productToForm(product))
    setEditFormError(null)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    if (editSubmitting) return
    setDrawerOpen(false)
    setSelected(null)
    setEditFormError(null)
  }

  const openAddDrawer = () => {
    setProductForm(emptyProductForm)
    setFormError(null)
    setAddDrawerOpen(true)
  }

  const closeAddDrawer = () => {
    if (submitting) return
    setAddDrawerOpen(false)
    setFormError(null)
  }

  const handleUpdateProduct = async () => {
    if (!selected || editSubmitting) return

    setEditFormError(null)
    setEditSubmitting(true)
    try {
      const updated = await updateProduct(selected.id, {
        code: editForm.code.trim(),
        name: editForm.name.trim(),
        category: editForm.category.trim(),
        price: Number(editForm.price),
        stock: Number(editForm.stock),
        maxStock: Number(editForm.maxStock),
        description: editForm.description.trim(),
        status: selected.status,
        icon: selected.icon,
      })
      await loadSummary()
      await loadProducts()
      setSelected(updated)
      setEditForm(productToForm(updated))
    } catch (err) {
      setEditFormError(err instanceof ApiError ? err.message : 'No se pudo actualizar el producto.')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDuplicateProduct = async (product: Product) => {
    if (duplicatingId) return

    setDuplicatingId(product.id)
    try {
      const duplicate = await duplicateProduct(product.id)
      await loadSummary()
      await loadProducts()
      openDrawer(duplicate)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'No se pudo duplicar el producto.')
    } finally {
      setDuplicatingId(null)
    }
  }

  const handleCreateProduct = async () => {
    setFormError(null)
    setSubmitting(true)
    try {
      await createProduct({
        code: productForm.code.trim(),
        name: productForm.name.trim(),
        category: productForm.category.trim(),
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        maxStock: Number(productForm.maxStock),
        description: productForm.description.trim(),
      })
      await loadSummary()
      setPage(1)
      setAddDrawerOpen(false)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'No se pudo crear el producto.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return

    setDeleting(true)
    try {
      await deleteProduct(deleteTarget.id)
      if (selected?.id === deleteTarget.id) closeDrawer()
      await loadSummary()
      await loadProducts()
      setDeleteTarget(null)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'No se pudo eliminar el producto.')
    } finally {
      setDeleting(false)
    }
  }

  const statCards = [
    {
      label: 'SKU TOTALES',
      value: stats.totalProducts.toLocaleString('es-CO'),
      change: 'Catálogo',
      icon: 'inventory',
      tone: 'primary' as const,
    },
    {
      label: 'PRODUCTOS ACTIVOS',
      value: stats.activeProducts.toLocaleString('es-CO'),
      change:
        stats.totalProducts > 0
          ? `${Math.round((stats.activeProducts / stats.totalProducts) * 100)}%`
          : '—',
      icon: 'check_circle',
      tone: 'tertiary' as const,
    },
    {
      label: 'SIN STOCK',
      value: String(stats.outOfStockProducts),
      change: stats.outOfStockProducts > 0 ? 'Alta prioridad' : 'OK',
      icon: 'warning',
      tone: 'error' as const,
    },
    {
      label: 'VALOR INVENTARIO',
      value: formatCOP(stats.totalInventoryValue),
      change: avgUnitPrice > 0 ? `~${formatCOP(avgUnitPrice)}/u` : '',
      icon: 'payments',
      tone: 'secondary' as const,
    },
  ]

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-on-surface-variant">
        Cargando productos…
      </div>
    )
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
        <PrimaryActionButton onClick={openAddDrawer}>Añadir producto</PrimaryActionButton>
      </div>

      <div className="mb-xl grid grid-cols-1 gap-md md:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-2 flex items-start justify-between">
              <div
                className={`rounded-lg p-2 ${
                  stat.tone === 'error'
                    ? 'bg-error-container/20 text-error'
                    : stat.tone === 'tertiary'
                      ? 'bg-tertiary-container text-tertiary'
                      : stat.tone === 'secondary'
                        ? 'bg-primary-container text-primary'
                        : 'bg-primary/10 text-primary'
                }`}
              >
                <Icon name={stat.icon} />
              </div>
              {stat.change && (
                <span
                  className={`text-[12px] font-bold ${
                    stat.tone === 'error' ? 'text-error' : 'text-on-surface-variant'
                  }`}
                >
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full min-w-0 shrink bg-surface-container-low border border-outline rounded-lg py-2.5 pl-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none md:w-auto"
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
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
        <div className={`min-w-0 max-w-full overflow-x-auto ${refreshing ? 'opacity-60' : ''}`}>
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
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-gutter py-8 text-center text-on-surface-variant">
                    No se encontraron productos con los filtros actuales.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
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
                    <td
                      className="hidden py-3 px-gutter text-right sm:table-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openDrawer(product)}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          type="button"
                          disabled={duplicatingId === product.id}
                          onClick={() => void handleDuplicateProduct(product)}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all disabled:opacity-50"
                          title="Duplicar"
                        >
                          <Icon name="content_copy" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(product)}
                          className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                          title="Eliminar"
                        >
                          <Icon name="delete" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationFooter className="p-md">
          <PaginationInfo>
            {totalCount === 0 ? (
              'Sin resultados'
            ) : (
              <>
                Mostrando{' '}
                <span className="font-bold">
                  {rangeStart.toLocaleString('es-CO')} a {rangeEnd.toLocaleString('es-CO')}
                </span>{' '}
                de {totalCount.toLocaleString('es-CO')} registros
              </>
            )}
          </PaginationInfo>
          <PaginationControls>
            <PaginationIconButton
              icon="chevron_left"
              disabled={page <= 1}
              className="disabled:opacity-30"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            />
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
              <PaginationPageButton key={pageNumber} active={pageNumber === page} onClick={() => setPage(pageNumber)}>
                {pageNumber}
              </PaginationPageButton>
            ))}
            <PaginationIconButton
              icon="chevron_right"
              disabled={page >= totalPages || totalPages === 0}
              className="disabled:opacity-30"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </PaginationControls>
        </PaginationFooter>
      </div>

      <Drawer
        open={addDrawerOpen}
        onClose={closeAddDrawer}
        title="Añadir producto"
        subtitle="Nuevo SKU"
        footer={
          <div className="flex flex-col gap-md">
            {formError && (
              <p className="text-body-sm text-error">{formError}</p>
            )}
            <div className="flex gap-md">
              <button
                type="button"
                onClick={closeAddDrawer}
                disabled={submitting}
                className="flex-1 py-2 border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-high disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleCreateProduct()}
                disabled={submitting}
                className="flex-1 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Guardando…' : 'Crear producto'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-lg">
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase">Código SKU</label>
            <input
              value={productForm.code}
              onChange={(e) => setProductForm((f) => ({ ...f, code: e.target.value }))}
              className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="EP-001"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase">Nombre del producto</label>
            <input
              value={productForm.name}
              onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase">Categoría</label>
            <Select
              value={productForm.category}
              onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option>Hardware</option>
              <option>Software</option>
              <option>Servicios</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase">Precio</label>
              <input
                value={productForm.price}
                onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                type="number"
                min={0}
                className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase">Stock</label>
              <input
                value={productForm.stock}
                onChange={(e) => setProductForm((f) => ({ ...f, stock: e.target.value }))}
                type="number"
                min={0}
                className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase">Stock máximo</label>
            <input
              value={productForm.maxStock}
              onChange={(e) => setProductForm((f) => ({ ...f, maxStock: e.target.value }))}
              type="number"
              min={0}
              className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase">Descripción</label>
            <textarea
              value={productForm.description}
              onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </div>
        </div>
      </Drawer>

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="Editar producto"
        subtitle={selected?.code}
        footer={
          <div className="flex flex-col gap-md">
            {editFormError && <p className="text-body-sm text-error">{editFormError}</p>}
            <div className="flex gap-md">
              <button
                type="button"
                onClick={closeDrawer}
                disabled={editSubmitting}
                className="flex-1 py-2 border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-high disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleUpdateProduct()}
                disabled={editSubmitting}
                className="flex-1 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 disabled:opacity-50"
              >
                {editSubmitting ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        }
      >
        {selected && (
          <div className="space-y-lg">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase">Código SKU</label>
              <input
                value={editForm.code}
                onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase">Nombre del producto</label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase">Categoría</label>
              <input
                value={editForm.category}
                onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase">Precio</label>
                <input
                  value={editForm.price}
                  onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                  type="number"
                  className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase">Stock</label>
                <input
                  value={editForm.stock}
                  onChange={(e) => setEditForm((f) => ({ ...f, stock: e.target.value }))}
                  type="number"
                  className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase">Stock máximo</label>
              <input
                value={editForm.maxStock}
                onChange={(e) => setEditForm((f) => ({ ...f, maxStock: e.target.value }))}
                type="number"
                className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase">Descripción</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full mt-1 border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Eliminar producto"
        icon="delete"
        footer={
          <div className="flex gap-md">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="flex-1 rounded-lg border border-outline-variant py-2 font-label-md text-label-md disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmDelete()}
              disabled={deleting}
              className="flex-1 rounded-lg bg-error py-2 font-label-md text-label-md text-on-error disabled:opacity-50"
            >
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        }
      >
        <p className="text-body-sm text-on-surface-variant">
          ¿Seguro que deseas eliminar <span className="font-semibold text-on-surface">{deleteTarget?.name}</span> (
          {deleteTarget?.code})? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  )
}
