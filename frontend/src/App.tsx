import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from './contexts/ThemeContext'
import { QueryProvider } from './providers/QueryProvider'
import { AuthProvider } from './auth/AuthProvider'
import { MockAuthProvider } from './auth/MockAuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { MuiLayout } from './components/layout/MuiLayout'
import { SimpleDashboard } from './pages/SimpleDashboard'
import { MuiCallOffs } from './pages/MuiCallOffs'
import { MuiQuotas } from './pages/MuiQuotas'
import { ConsolidatedView } from './pages/ConsolidatedView'
import { Inventory } from './pages/Inventory'
import { LoginForm } from './auth/LoginForm'
import { RegisterForm } from './auth/RegisterForm'
import { ResetPasswordForm } from './auth/ResetPasswordForm'
import { ProfileSettings } from './auth/ProfileSettings'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { DevBanner } from './components/DevBanner'

const TransportOrders = () => (
  <div>
    <h1>Transport Orders</h1>
    <p>Transport Order Management - Coming Soon</p>
  </div>
)

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
})

function App() {
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
  const AuthProviderComponent = isDevMode ? MockAuthProvider : AuthProvider

  return (
    <ThemeProvider defaultTheme="dark">
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <DevBanner />
        <Router>
          <AuthProviderComponent>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginForm />} />
              <Route path="/register" element={<RegisterForm />} />
              <Route path="/reset-password" element={<ResetPasswordForm />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              
              {/* Protected routes */}
              <Route element={
                <ProtectedRoute>
                  <MuiLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<SimpleDashboard />} />
                <Route path="/consolidated" element={
                  <ProtectedRoute roles={['OPS', 'TRADE', 'PLANNER', 'ADMIN']}>
                    <QueryProvider>
                      <ConsolidatedView />
                    </QueryProvider>
                  </ProtectedRoute>
                } />
                <Route path="/quotas" element={
                  <ProtectedRoute roles={['OPS', 'TRADE', 'PLANNER', 'ADMIN']}>
                    <QueryProvider>
                      <MuiQuotas />
                    </QueryProvider>
                  </ProtectedRoute>
                } />
                <Route path="/call-offs" element={
                  <ProtectedRoute roles={['OPS', 'TRADE', 'PLANNER', 'ADMIN']}>
                    <QueryProvider>
                      <MuiCallOffs />
                    </QueryProvider>
                  </ProtectedRoute>
                } />
                <Route path="/transport" element={
                  <ProtectedRoute roles={['OPS', 'PLANNER', 'ADMIN']}>
                    <TransportOrders />
                  </ProtectedRoute>
                } />
                <Route path="/inventory" element={
                  <ProtectedRoute roles={['OPS', 'PLANNER', 'ADMIN']}>
                    <Inventory />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <ProfileSettings />
                  </ProtectedRoute>
                } />
              </Route>
            </Routes>
          </AuthProviderComponent>
        </Router>
      </MuiThemeProvider>
    </ThemeProvider>
  )
}

export default App