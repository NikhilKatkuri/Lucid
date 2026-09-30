import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  mockLogin,
  mockRegister,
  mockRequestCode,
  mockVerifyCode,
} from './api'
import type { MockUser, RegisterInput } from './api'

const SESSION_KEY = 'inventory.mock.session'

/**
 * Mock session is only the user's profile (never a token) so a page refresh
 * does not lose the demo. When the real API lands, keep the access token in
 * memory only and restore it via the httpOnly refresh cookie.
 */
function readStoredUser(): MockUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as MockUser) : null
  } catch {
    return null
  }
}

interface AuthContextValue {
  user: MockUser | null
  isAuthenticated: boolean
  /** Email/destination the OTP + MFA screens refer to. */
  pendingEmail: string | null
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  requestCode: (email?: string) => Promise<void>
  verifyCode: (code: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(readStoredUser)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const startSession = useCallback((next: MockUser) => {
    setUser(next)
    setPendingEmail(null)
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(next))
    } catch {
      /* storage unavailable — in-memory session is enough */
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const next = await mockLogin(email, password)
      startSession(next)
    },
    [startSession],
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      const next = await mockRegister(input)
      startSession(next)
    },
    [startSession],
  )

  const requestCode = useCallback(
    async (email?: string) => {
      await mockRequestCode(email)
      setPendingEmail(email ?? null)
    },
    [],
  )

  const verifyCode = useCallback(async (code: string) => {
    await mockVerifyCode(code)
    // A verified code establishes the session (mock user, memory/local only).
    setUser(
      (current) =>
        current ?? {
          id: 'usr_demo',
          name: 'Demo User',
          email: pendingEmail ?? 'demo@acme.com',
        },
    )
    setPendingEmail(null)
  }, [pendingEmail])

  const logout = useCallback(() => {
    setUser(null)
    setPendingEmail(null)
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      pendingEmail,
      login,
      register,
      requestCode,
      verifyCode,
      logout,
    }),
    [user, pendingEmail, login, register, requestCode, verifyCode, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
