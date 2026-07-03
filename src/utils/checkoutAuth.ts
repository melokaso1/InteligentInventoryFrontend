import { isLoggedIn } from '../hooks/useAuth'

const CONFIRM_PATTERN = /confirmar\s*compra|confirmo\s*(la\s*)?(compra|pedido)/i
const CANCEL_PATTERN = /cancelar|cancel/i
const AFFIRMATIVE_PATTERN = /^(s[ií]|yes|ok|vale)$/i

export const CHECKOUT_AUTH_STATES = new Set([
  'awaiting_confirmation',
  'awaiting_use_saved_address',
  'awaiting_delivery_address',
  'awaiting_save_address',
])

export function buildCheckoutLoginUrl(): string {
  const params = new URLSearchParams({
    returnTo: '/chatbot',
    resumeCheckout: '1',
  })
  return `/login?${params.toString()}`
}

export function buildCheckoutRegisterUrl(): string {
  const params = new URLSearchParams({
    returnTo: '/chatbot',
    resumeCheckout: '1',
  })
  return `/register?${params.toString()}`
}

export function messageRequiresCheckoutAuth(chatState: string, message: string): boolean {
  if (isLoggedIn() || !CHECKOUT_AUTH_STATES.has(chatState)) {
    return false
  }

  const normalized = message.trim()
  if (!normalized || CANCEL_PATTERN.test(normalized)) {
    return false
  }

  if (chatState === 'awaiting_confirmation') {
    return CONFIRM_PATTERN.test(normalized)
  }

  if (chatState === 'awaiting_use_saved_address') {
    return AFFIRMATIVE_PATTERN.test(normalized) || normalized.length > 0
  }

  return true
}

export const CHECKOUT_AUTH_MESSAGE =
  'Para confirmar tu pedido, inicia sesión o regístrate. Tu carrito se conservará al volver al chat.'
