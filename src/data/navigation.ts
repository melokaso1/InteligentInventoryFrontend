import type { NavItem } from '../types'

export const navItems: NavItem[] = [
  { to: '/', label: 'Panel', icon: 'dashboard', adminOnly: true },
  { to: '/products', label: 'Productos', icon: 'inventory_2', adminOnly: true },
  { to: '/inventory', label: 'Inventario', icon: 'warehouse', adminOnly: true },
  { to: '/sales', label: 'Ventas', icon: 'payments', adminOnly: true },
  { to: '/invoices', label: 'Facturas', icon: 'receipt_long', adminOnly: true },
  { to: '/reports', label: 'Informes', icon: 'description', adminOnly: true },
  { to: '/chatbot', label: 'Chatbot', icon: 'smart_toy' },
]
