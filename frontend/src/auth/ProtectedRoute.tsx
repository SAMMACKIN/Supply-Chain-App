import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types/auth'
import { canUserAccessRoute } from '../utils/auth-helpers'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: UserRole[]
  requireAuth?: boolean
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  roles,
  requireAuth = true,
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()
  
  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}
      >
        <CircularProgress />
      </Box>
    )
  }
  
  // Check if authentication is required and user is not logged in
  if (requireAuth && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }
  
  // Check if user has required role
  if (roles && user?.profile?.role) {
    const hasRequiredRole = roles.includes(user.profile.role)
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />
    }
  }
  
  // Check route-based permissions
  if (user?.profile?.role) {
    const canAccess = canUserAccessRoute(user.profile.role, location.pathname)
    if (!canAccess) {
      return <Navigate to="/unauthorized" replace />
    }
  }
  
  return <>{children}</>
}