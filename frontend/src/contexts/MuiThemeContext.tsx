import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material'
import { useTheme } from './ThemeContext'

const MuiThemeContext = createContext({})

export function useMuiTheme() {
  return useContext(MuiThemeContext)
}

interface CustomMuiThemeProviderProps {
  children: ReactNode
}

export function CustomMuiThemeProvider({ children }: CustomMuiThemeProviderProps) {
  const { theme } = useTheme()

  const muiTheme = createTheme({
    palette: {
      mode: theme,
      primary: {
        main: '#2563eb',
        light: '#3b82f6',
        dark: '#1d4ed8',
      },
      secondary: {
        main: '#64748b',
        light: '#94a3b8',
        dark: '#475569',
      },
      background: {
        default: theme === 'dark' ? '#0f172a' : '#f8fafc',
        paper: theme === 'dark' ? '#1e293b' : '#ffffff',
      },
      text: {
        primary: theme === 'dark' ? '#f1f5f9' : '#0f172a',
        secondary: theme === 'dark' ? '#94a3b8' : '#64748b',
      },
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: {
        fontWeight: 700,
        fontSize: '2.5rem',
      },
      h2: {
        fontWeight: 600,
        fontSize: '2rem',
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.5rem',
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.25rem',
      },
      h5: {
        fontWeight: 600,
        fontSize: '1.125rem',
      },
      h6: {
        fontWeight: 600,
        fontSize: '1rem',
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: '0.5rem',
            fontWeight: 500,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: '0.75rem',
            boxShadow: theme === 'dark' 
              ? '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' 
              : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: '0.75rem',
          },
        },
      },
    },
  })

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <MuiThemeContext.Provider value={{}}>
        {children}
      </MuiThemeContext.Provider>
    </MuiThemeProvider>
  )
}