import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: number
  username: string
  name: string
  email?: string
  role: 'user' | 'admin'
}

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
      isAuthenticated: () => !!get().token,
    }),
    { name: 'irpf-auth' }
  )
)

// ─── API Client ──────────────────────────────────────────────
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().token
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }
  const res = await fetch(`/api${path}`, { ...options, headers })
  if (res.status === 401) {
    useAuthStore.getState().clearAuth()
    window.location.href = '/login'
    throw new Error('Não autorizado')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error || `Erro ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    apiRequest<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (username: string, password: string, name: string) =>
    apiRequest<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, name }),
    }),
  me: () => apiRequest<User>('/auth/me'),

  // Declarations IRPF
  declarations: {
    list: (month: string) => apiRequest<Declaration[]>(`/declarations?month=${encodeURIComponent(month)}`),
    create: (data: Omit<Declaration, 'id' | 'createdAt' | 'updatedAt'>) =>
      apiRequest<Declaration>('/declarations', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Declaration>) =>
      apiRequest<Declaration>(`/declarations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest(`/declarations/${id}`, { method: 'DELETE' }),
    deleteAll: (month: string) =>
      apiRequest(`/declarations/all?month=${encodeURIComponent(month)}`, { method: 'DELETE' }),
  },

  // Declarations ITR
  itr: {
    list: (month: string) => apiRequest<Declaration[]>(`/itr?month=${encodeURIComponent(month)}`),
    create: (data: Omit<Declaration, 'id' | 'createdAt' | 'updatedAt'>) =>
      apiRequest<Declaration>('/itr', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Declaration>) =>
      apiRequest<Declaration>(`/itr/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest(`/itr/${id}`, { method: 'DELETE' }),
    deleteAll: (month: string) =>
      apiRequest(`/itr/all?month=${encodeURIComponent(month)}`, { method: 'DELETE' }),
  },

  // Collaborators
  collaborators: {
    list: () => apiRequest<Collaborator[]>('/collaborators'),
    add: (name: string) =>
      apiRequest<Collaborator>('/collaborators', { method: 'POST', body: JSON.stringify({ name }) }),
    remove: (id: number) => apiRequest(`/collaborators/${id}`, { method: 'DELETE' }),
  },

  // Settings
  settings: {
    get: () => apiRequest<Settings>('/settings'),
    update: (data: Partial<Settings>) =>
      apiRequest<Settings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // Commissions
  commissions: {
    all: () => apiRequest<CommissionData[]>('/commissions'),
    itr: () => apiRequest<CommissionData[]>('/commissions/itr'),
  },

  // Quotas
  quotas: {
    list: () => apiRequest<Quota[]>('/quotas'),
    create: (data: Omit<Quota, 'id' | 'createdAt' | 'updatedAt'>) =>
      apiRequest<Quota>('/quotas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Quota>) =>
      apiRequest<Quota>(`/quotas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest(`/quotas/${id}`, { method: 'DELETE' }),
  },

  // Import/Export
  importExcel: (data: { declarations: unknown[]; collaborators: string[] }) =>
    apiRequest('/import', { method: 'POST', body: JSON.stringify(data) }),
  exportExcel: () => apiRequest('/export'),
}

// ─── Types ───────────────────────────────────────────────────
export interface Declaration {
  id: number
  month: string
  collaborator: string
  cpfCliente?: string
  cliente: string
  valorRecebido: number
  clienteType: 'Sócio' | 'Diversos'
  comissao?: number
  statusPagamento: 'PAGO' | 'AGUARDANDO' | 'DOAÇÃO'
  createdAt?: string
  updatedAt?: string
}

export interface Collaborator {
  id: number
  name: string
  createdAt?: string
}

export interface Settings {
  percentualDiversos: number
  valorFixoSocio: number
}

export interface CommissionData {
  collaborator: string
  months: Record<string, { vendas: number; recebido: number; comissao: number }>
}

export interface Quota {
  id: number
  collaborator: string
  cliente: string
  quantidadeCotas: number
  cotasEnviadas: number
  meioEnvio: string
  createdAt?: string
  updatedAt?: string
}
