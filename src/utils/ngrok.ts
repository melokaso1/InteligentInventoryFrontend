/** Header required by ngrok free tier to skip the browser interstitial on programmatic requests. */
export const NGROK_SKIP_BROWSER_WARNING_HEADER = 'ngrok-skip-browser-warning'

export function isNgrokHost(hostOrUrl: string): boolean {
  return /ngrok/i.test(hostOrUrl)
}

export function shouldSendNgrokSkipHeader(apiBase = ''): boolean {
  if (isNgrokHost(apiBase)) return true
  if (typeof window !== 'undefined' && isNgrokHost(window.location.hostname)) return true
  return false
}

export function ngrokSkipHeaders(apiBase = ''): Record<string, string> {
  return shouldSendNgrokSkipHeader(apiBase)
    ? { [NGROK_SKIP_BROWSER_WARNING_HEADER]: 'true' }
    : {}
}

/** Patch window.fetch so every request from the SPA includes the ngrok skip header. */
export function installNgrokFetchPatch(): void {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return
  if (!isNgrokHost(window.location.hostname)) return

  const nativeFetch = window.fetch.bind(window)
  const headerKey = NGROK_SKIP_BROWSER_WARNING_HEADER

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const nextInit: RequestInit = { ...init }
    const headers = new Headers(
      nextInit.headers ?? (input instanceof Request ? input.headers : undefined),
    )
    if (!headers.has(headerKey)) {
      headers.set(headerKey, 'true')
    }
    nextInit.headers = headers
    return nativeFetch(input, nextInit)
  }
}
