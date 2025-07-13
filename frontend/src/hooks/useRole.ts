import { useAuth } from './useAuth'
import type { UserRole } from '../types/auth'
import { hasPermission } from '../utils/auth-helpers'

export function useRole() {
  const { user } = useAuth()
  const userRole = user?.profile?.role
  
  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!userRole) return false
    
    if (Array.isArray(role)) {
      return role.includes(userRole)
    }
    
    return userRole === role
  }
  
  const hasAccess = (resource: string, action: string): boolean => {
    return hasPermission(userRole, resource as any, action)
  }
  
  const isAdmin = (): boolean => {
    return userRole === 'ADMIN'
  }
  
  const isOps = (): boolean => {
    return userRole === 'OPS'
  }
  
  const isTrade = (): boolean => {
    return userRole === 'TRADE'
  }
  
  const isPlanner = (): boolean => {
    return userRole === 'PLANNER'
  }
  
  return {
    role: userRole,
    hasRole,
    hasAccess,
    isAdmin,
    isOps,
    isTrade,
    isPlanner
  }
}