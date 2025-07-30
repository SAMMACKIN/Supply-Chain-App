import React, { Component, ErrorInfo, ReactNode } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Collapse,
  Divider
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  BugReport as BugReportIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  enableRetry?: boolean
  enableReporting?: boolean
  development?: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo)

    // Log error in development
    if (this.props.development || process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // In production, you might want to send error to a logging service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // reportError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    })
  }

  handleReportError = () => {
    const { error, errorInfo } = this.state
    if (error && errorInfo) {
      // In a real app, this would send to an error reporting service
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
      
      console.log('Error report:', errorReport)
      
      // Example: Send to error reporting service
      // fetch('/api/error-report', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // })
      
      alert('Error report generated. Please check the console for details.')
    }
  }

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }))
  }

  render() {
    const { hasError, error, errorInfo, showDetails } = this.state
    const { 
      children, 
      fallback, 
      enableRetry = true, 
      enableReporting = false,
      development = process.env.NODE_ENV === 'development'
    } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Default error UI
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            p: 3
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%',
              textAlign: 'center'
            }}
          >
            <BugReportIcon
              sx={{
                fontSize: 64,
                color: 'error.main',
                mb: 2
              }}
            />
            
            <Typography variant="h5" color="error" gutterBottom>
              Something went wrong
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {development
                ? error?.message || 'An unexpected error occurred'
                : 'An unexpected error occurred. Please try refreshing the page.'
              }
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
              {enableRetry && (
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleRetry}
                >
                  Try Again
                </Button>
              )}
              
              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </Box>

            {(development || enableReporting) && (
              <Box>
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
                  {development && (
                    <Button
                      size="small"
                      onClick={this.toggleDetails}
                      startIcon={
                        <ExpandMoreIcon
                          sx={{
                            transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                          }}
                        />
                      }
                    >
                      {showDetails ? 'Hide' : 'Show'} Error Details
                    </Button>
                  )}
                  
                  {enableReporting && (
                    <Button
                      size="small"
                      color="secondary"
                      onClick={this.handleReportError}
                    >
                      Report Error
                    </Button>
                  )}
                </Box>

                {development && (
                  <Collapse in={showDetails}>
                    <Alert severity="error" sx={{ textAlign: 'left' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Error Details:
                      </Typography>
                      <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                        {error?.stack}
                      </Typography>
                      
                      {errorInfo?.componentStack && (
                        <>
                          <Typography variant="subtitle2" gutterBottom>
                            Component Stack:
                          </Typography>
                          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                            {errorInfo.componentStack}
                          </Typography>
                        </>
                      )}
                    </Alert>
                  </Collapse>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      )
    }

    return children
  }
}

// Functional component wrapper for hooks support
interface ErrorBoundaryWrapperProps extends Omit<ErrorBoundaryProps, 'development'> {
  children: ReactNode
}

export function ErrorBoundaryWrapper(props: ErrorBoundaryWrapperProps) {
  const development = process.env.NODE_ENV === 'development'
  
  return (
    <ErrorBoundary {...props} development={development}>
      {props.children}
    </ErrorBoundary>
  )
}