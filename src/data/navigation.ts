import type { NavItem } from '../types'

export const navItems: NavItem[] = [
  { to: '/', label: 'Panel', icon: 'dashboard', adminOnly: true },
  { to: '/products', label: 'Productos', icon: 'inventory_2', adminOnly: true },
  { to: '/inventory', label: 'Inventario', icon: 'warehouse', adminOnly: true },
  { to: '/sales', label: 'Ventas', icon: 'payments', adminOnly: true },
  { to: '/dispatch', label: 'Despacho', icon: 'local_shipping', adminOnly: true },
  { to: '/invoices', label: 'Facturas', icon: 'receipt_long', adminOnly: true },
  { to: '/reports', label: 'Informes', icon: 'description', adminOnly: true },
  { to: '/my-invoices', label: 'Mis facturas', icon: 'receipt_long', clienteOnly: true },
  { to: '/my-orders', label: 'Mis pedidos', icon: 'local_shipping', clienteOnly: true },
  { to: '/chatbot', label: 'Chatbot', icon: 'smart_toy' },
]
