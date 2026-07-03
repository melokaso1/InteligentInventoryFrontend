import { invalidateProductPersisted } from './persistedCache'

export type DataMutationScope = 'all' | 'inventory' | 'sales' | 'invoices' | 'products' | 'dashboard' | 'orders' | 'notifications'

const CHANNEL_NAME = 'elplonsazo-data-sync'
const EVENT_NAME = 'elplonsazo-data-mutation'

interface DataMutationMessage {
  type: typeof EVENT_NAME
  scope: DataMutationScope
  at: number
}

let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  channel ??= new BroadcastChannel(CHANNEL_NAME)
  return channel
}

export function notifyDataMutation(scope: DataMutationScope = 'all'): void {
  const payload: DataMutationMessage = { type: EVENT_NAME, scope, at: Date.now() }
  getChannel()?.postMessage(payload)
  window.dispatchEvent(new CustomEvent<DataMutationMessage>(EVENT_NAME, { detail: payload }))

  if (scope === 'all' || scope === 'products') {
    invalidateProductPersisted()
  }
}

export function subscribeDataMutations(
  callback: (scope: DataMutationScope) => void,
): () => void {
  const onMessage = (event: MessageEvent<DataMutationMessage>) => {
    if (event.data?.type === EVENT_NAME) {
      callback(event.data.scope ?? 'all')
    }
  }

  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<DataMutationMessage>).detail
    if (detail?.type === EVENT_NAME) {
      callback(detail.scope ?? 'all')
    }
  }

  const bc = getChannel()
  bc?.addEventListener('message', onMessage)
  window.addEventListener(EVENT_NAME, onCustom)

  return () => {
    bc?.removeEventListener('message', onMessage)
    window.removeEventListener(EVENT_NAME, onCustom)
  }
}

export function matchesMutationScope(
  mutationScope: DataMutationScope,
  listenScopes?: DataMutationScope | DataMutationScope[],
): boolean {
  if (!listenScopes) return true
  const scopes = Array.isArray(listenScopes) ? listenScopes : [listenScopes]
  if (scopes.includes('all')) return true
  return mutationScope === 'all' || scopes.includes(mutationScope)
}
