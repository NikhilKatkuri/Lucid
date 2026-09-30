/**
 * Typed mock auth API — simulates network latency and the real endpoints
 * (`POST /auth/login`, `/auth/register`, `/auth/otp`, `/auth/mfa`,
 * `/auth/forgot-password`). Swap this module for the Axios client when the
 * ASP.NET Core backend is available; the AuthProvider contract does not change.
 */

/** Demo verification code accepted by the OTP + MFA screens. */
export const DEMO_CODE = '123456'

import { api, setAccessToken, unwrap } from '../../shared/api/client'
import { env } from '../../shared/config/env'

export interface MockUser {
  id: string
  name: string
  email: string
  organizationName?: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  organizationName?: string
}

const delay = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms))

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function assertCredentials(email: string, password: string) {
  if (!EMAIL_RE.test(email)) throw new Error('Enter a valid email address.')
  if (password.length < 6) throw new Error('Password must be at least 6 characters.')
}

export async function mockLogin(
  email: string,
  password: string,
): Promise<MockUser> {
  await delay()
  assertCredentials(email, password)
  const local = email.split('@')[0]
  return {
    id: `usr_${local}`,
    name: local
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(' '),
    email,
  }
}

export async function mockRegister(input: RegisterInput): Promise<MockUser> {
  await delay(900)
  assertCredentials(input.email, input.password)
  return {
    id: `usr_${Date.now()}`,
    name: input.name,
    email: input.email,
    organizationName: input.organizationName,
  }
}

/** Pretends to send a one-time code / MFA code / reset link. */
export async function mockRequestCode(email?: string): Promise<{ sentTo: string }> {
  await delay(500)
  return { sentTo: email ?? 'your email' }
}

export async function mockVerifyCode(code: string): Promise<void> {
  await delay(650)
  if (code !== DEMO_CODE) {
    throw new Error(`That code is not correct. Use the demo code ${DEMO_CODE}.`)
  }
}

export async function mockSendResetLink(email: string): Promise<void> {
  await delay(800)
  if (!EMAIL_RE.test(email)) throw new Error('Enter a valid email address.')
}

interface AuthPayload {
  accessToken: string
  user: { id: string; email: string; displayName: string; emailVerified: boolean }
}

export async function apiLogin(email: string, password: string): Promise<MockUser> {
  const { data } = await api.post('/auth/signin', { email, password })
  const auth = unwrap<AuthPayload>(data)
  setAccessToken(auth.accessToken)
  return { id: auth.user.id, name: auth.user.displayName, email: auth.user.email }
}

export async function apiRegister(input: RegisterInput): Promise<MockUser> {
  const { data } = await api.post('/auth/signup', {
    email: input.email, password: input.password, displayName: input.name,
  })
  const auth = unwrap<AuthPayload>(data)
  setAccessToken(auth.accessToken)
  return { id: auth.user.id, name: auth.user.displayName, email: auth.user.email, organizationName: input.organizationName }
}

export async function apiLogout(): Promise<void> {
  try { await api.post('/auth/logout') } finally { setAccessToken(null) }
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (env.VITE_USE_MOCK) return mockSendResetLink(email)
  await api.post('/auth/forgot-password', { email })
}
