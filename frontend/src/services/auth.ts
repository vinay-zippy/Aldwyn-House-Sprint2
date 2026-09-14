export type UserRole = 'FRONT_DESK' | 'HOUSEKEEPING'

const TOKEN_KEY = 'aldwyn_access_token'
const ROLE_KEY = 'aldwyn_role'
const USERNAME_KEY = 'aldwyn_username'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getRole(): UserRole | null {
  return localStorage.getItem(ROLE_KEY) as UserRole | null
}

export function getUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY)
}

export function saveSession(session: { access_token: string; role: UserRole; username: string }) {
  localStorage.setItem(TOKEN_KEY, session.access_token)
  localStorage.setItem(ROLE_KEY, session.role)
  localStorage.setItem(USERNAME_KEY, session.username)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(USERNAME_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getToken() && getRole())
}
