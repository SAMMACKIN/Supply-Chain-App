import type { UserRole } from '../types/auth'
import { ROLE_PERMISSIONS } from '../types/auth'

export function hasPermission(
  userRole: UserRole | undefined,
  resource: keyof typeof ROLE_PERMISSIONS.OPS,
  action: string
): boolean {
  if (!userRole) return false
  
  const permissions = ROLE_PERMISSIONS[userRole]
  if (!permissions) return false
  
  const resourcePermissions = permissions[resource]
  if (!resourcePermissions) return false
  
  return resourcePermissions.includes(action as any)
}

export function canUserAccessRoute(userRole: UserRole | undefined, route: string): boolean {
  if (!userRole) return false
  
  const routePermissions: Record<string, UserRole[]> = {
    '/': ['OPS', 'TRADE', 'PLANNER', 'ADMIN'],
    '/dashboard': ['OPS', 'TRADE', 'PLANNER', 'ADMIN'],
    '/quotas': ['OPS', 'TRADE', 'PLANNER', 'ADMIN'],
    '/call-offs': ['OPS', 'TRADE', 'PLANNER', 'ADMIN'],
    '/transport': ['OPS', 'PLANNER', 'ADMIN'],
    '/inventory': ['OPS', 'PLANNER', 'ADMIN'],
    '/admin': ['ADMIN'],
    '/profile': ['OPS', 'TRADE', 'PLANNER', 'ADMIN']
  }
  
  const allowedRoles = routePermissions[route]
  if (!allowedRoles) return true // Allow access to undefined routes by default
  
  return allowedRoles.includes(userRole)
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '??'
  
  const parts = name.trim().split(' ')
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function formatUserDisplayName(profile: { display_name?: string | null; email: string }): string {
  return profile.display_name || profile.email.split('@')[0]
}