export const CHAT_ONBOARDING_KEY = 'plonsazo-chat-onboarded-v1'

export function hasCompletedChatOnboarding(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(CHAT_ONBOARDING_KEY) === 'true'
  } catch {
    return true
  }
}

export function markChatOnboardingComplete(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CHAT_ONBOARDING_KEY, 'true')
  } catch {
    // ignore storage errors
  }
}

export function isWelcomeOnlyConversation(messageIds: string[]): boolean {
  return messageIds.length > 0 && messageIds.every((id) => id.startsWith('welcome-'))
}
