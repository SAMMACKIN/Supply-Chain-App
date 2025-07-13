import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from './contexts/ThemeContext'
import { QueryProvider } from './providers/QueryProvider'
import { MuiLayout } from './components/layout/MuiLayout'
import { SimpleDashboard } from './pages/SimpleDashboard'
import { MuiCallOffs } from './pages/MuiCallOffs'
import { MuiQuotas } from './pages/MuiQuotas'
import { TestSupabase } from './pages/TestSupabase'
import { DebugDatabase } from './pages/DebugDatabase'

const TransportOrders = () => (
  <div>
    <h1>Transport Orders</h1>
    <p>Transport Order Management - Coming Soon</p>
  </div>
)

const Inventory = () => <DebugDatabase />

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
})

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <MuiLayout>
            <Routes>
              <Route path="/" element={<SimpleDashboard />} />
              <Route path="/quotas" element={
                <QueryProvider>
                  <MuiQuotas />
                </QueryProvider>
              } />
              <Route path="/call-offs" element={
                <QueryProvider>
                  <MuiCallOffs />
                </QueryProvider>
              } />
              <Route path="/transport" element={<TransportOrders />} />
              <Route path="/inventory" element={<Inventory />} />
            </Routes>
          </MuiLayout>
        </Router>
      </MuiThemeProvider>
    </ThemeProvider>
  )
}

export default App