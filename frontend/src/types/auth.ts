export type UserRole = 'OPS' | 'TRADE' | 'PLANNER' | 'ADMIN'

export interface UserProfile {
  id: string
  user_id: string
  email: string
  display_name: string | null
  business_unit: string
  role: UserRole
  warehouse_ids: string[]
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  email: string
  profile?: UserProfile
}

export interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData extends LoginCredentials {
  display_name: string
  business_unit: string
  role: UserRole
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  hasRole: (role: UserRole | UserRole[]) => boolean
  canAccess: (resource: string, action: string) => boolean
}

export const ROLE_PERMISSIONS = {
  OPS: {
    calloffs: ['create', 'read', 'update', 'delete'],
    quotas: ['create', 'read', 'update', 'delete'],
    transport: ['create', 'read', 'update', 'delete'],
    inventory: ['read', 'update'],
    users: []
  },
  TRADE: {
    calloffs: ['create', 'read', 'update'],
    quotas: ['read'],
    transport: ['read'],
    inventory: ['read'],
    users: []
  },
  PLANNER: {
    calloffs: ['read', 'fulfill'],
    quotas: ['read'],
    transport: ['create', 'read', 'update'],
    inventory: ['read'],
    users: []
  },
  ADMIN: {
    calloffs: ['create', 'read', 'update', 'delete'],
    quotas: ['create', 'read', 'update', 'delete'],
    transport: ['create', 'read', 'update', 'delete'],
    inventory: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete']
  }
} as const