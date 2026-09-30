import axios from 'axios'
import { env } from '../config/env'

const TOKEN_KEY = 'lucid.accessToken'
const TENANT_KEY = 'lucid.activeTenant'

export const getAccessToken = () => sessionStorage.getItem(TOKEN_KEY)
export const setAccessToken = (token: string | null) => {
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)
}
export const setApiTenant = (tenantId: string | null) => {
  if (tenantId) sessionStorage.setItem(TENANT_KEY, tenantId)
  else sessionStorage.removeItem(TENANT_KEY)
}

const configuredApiUrl = env.VITE_API_URL.replace(/\/$/, '')
const apiBaseUrl = configuredApiUrl.endsWith('/api') ? `${configuredApiUrl}/v1` : configuredApiUrl
export const api = axios.create({ baseURL: apiBaseUrl, timeout: 20_000 })
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  const tenantId = sessionStorage.getItem(TENANT_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (tenantId) config.headers['X-Tenant-ID'] = tenantId
  return config
})
api.interceptors.response.use((response) => response, (error) => {
  const message = error.response?.data?.message ?? error.response?.data?.title ?? error.message ?? 'Request failed'
  return Promise.reject(new Error(message))
})

export interface ApiEnvelope<T> { success: boolean; message?: string; data: T }
export const unwrap = <T>(value: ApiEnvelope<T>) => value.data
