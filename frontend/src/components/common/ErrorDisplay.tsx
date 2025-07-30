import React, { useState } from 'react'
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  Typography,
  Chip,
  Divider
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as CopyIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material'

export interface ErrorDisplayProps {
  error: Error | string | null
  title?: string
  severity?: 'error' | 'warning' | 'info'
  onRetry?: () => void
  onReport?: (error: Error | string) => void
  showTechnicalDetails?: boolean
  suggestions?: string[]
  context?: Record<string, any>
  retryText?: string
  className?: string
}

interface ErrorContext {
  timestamp: string
  userAgent: string
  url: string
  [key: string]: any
}

export function ErrorDisplay({
  error,
  title,
  severity = 'error',
  onRetry,
  onReport,
  showTechnicalDetails = process.env.NODE_ENV === 'development',
  suggestions = [],
  context = {},
  retryText = 'Try Again',
  className
}: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!error) return null

  const errorMessage = typeof error === 'string' ? error : error.message
  const errorStack = typeof error === 'string' ? undefined : error.stack

  // Generate error context
  const errorContext: ErrorContext = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...context
  }

  // Get user-friendly error message and suggestions
  const getUserFriendlyMessage = (message: string): { friendlyMessage: string; suggestions: string[] } => {
    const lowerMessage = message.toLowerCase()
    
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return {
        friendlyMessage: 'Network connection issue. Please check your internet connection.',
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Contact support if the problem persists'
        ]
      }
    }
    
    if (lowerMessage.includes('timeout')) {
      return {
        friendlyMessage: 'The request took too long to complete.',
        suggestions: [
          'Try again in a few moments',
          'Check your internet connection',
          'Contact support if timeouts persist'
        ]
      }
    }
    
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
      return {
        friendlyMessage: 'You are not authorized to perform this action.',
        suggestions: [
          'Please log in again',
          'Contact your administrator for access',
          'Refresh the page and try again'
        ]
      }
    }
    
    if (lowerMessage.includes('forbidden') || lowerMessage.includes('403')) {
      return {
        friendlyMessage: 'You do not have permission to access this resource.',
        suggestions: [
          'Contact your administrator for access',
          'Verify you have the correct permissions'
        ]
      }
    }
    
    if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
      return {
        friendlyMessage: 'The requested resource could not be found.',
        suggestions: [
          'Check the URL and try again',
          'Go back and try a different approach',
          'Contact support if you believe this is an error'
        ]
      }
    }
    
    if (lowerMessage.includes('server') || lowerMessage.includes('500')) {
      return {
        friendlyMessage: 'A server error occurred. This is not your fault.',
        suggestions: [
          'Try again in a few minutes',
          'Contact support if the problem persists',
          'Save your work before trying again'
        ]
      }
    }
    
    return {
      friendlyMessage: 'An unexpected error occurred.',
      suggestions: [
        'Try refreshing the page',
        'Try again in a few minutes',
        'Contact support if the problem persists'
      ]
    }
  }

  const { friendlyMessage, suggestions: autoSuggestions } = getUserFriendlyMessage(errorMessage)
  const allSuggestions = [...suggestions, ...autoSuggestions].filter((item, index, arr) => arr.indexOf(item) === index)

  const handleCopyError = async () => {
    const errorDetails = {
      message: errorMessage,
      stack: errorStack,
      context: errorContext
    }
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy error details:', err)
    }
  }

  const handleReportError = () => {
    onReport?.(error)
  }

  return (
    <Alert
      severity={severity}
      className={className}
      sx={{
        '& .MuiAlert-message': {
          width: '100%'
        }
      }}
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      
      <Typography variant="body2" sx={{ mb: allSuggestions.length > 0 ? 2 : 0 }}>
        {friendlyMessage}
      </Typography>

      {allSuggestions.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
            Suggestions:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {allSuggestions.map((suggestion, index) => (
              <Typography key={index} variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 8 }}>•</span>
                {suggestion}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {onRetry && (
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            variant="outlined"
          >
            {retryText}
          </Button>
        )}
        
        {showTechnicalDetails && (
          <Button
            size="small"
            onClick={() => setShowDetails(!showDetails)}
            startIcon={
              <ExpandMoreIcon
                sx={{
                  transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              />
            }
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        )}
        
        {showTechnicalDetails && (
          <Button
            size="small"
            onClick={handleCopyError}
            startIcon={<CopyIcon />}
            disabled={copied}
          >
            {copied ? 'Copied!' : 'Copy Error'}
          </Button>
        )}
        
        {onReport && (
          <Button
            size="small"
            onClick={handleReportError}
            startIcon={<BugReportIcon />}
            color="secondary"
          >
            Report
          </Button>
        )}
      </Box>

      {showTechnicalDetails && (
        <Collapse in={showDetails}>
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>
              Technical Details:
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Chip
                label={`Error: ${errorMessage}`}
                size="small"
                color="error"
                variant="outlined"
                sx={{ mb: 1, mr: 1 }}
              />
              <Chip
                label={`Time: ${new Date(errorContext.timestamp).toLocaleString()}`}
                size="small"
                variant="outlined"
                sx={{ mb: 1, mr: 1 }}
              />
            </Box>

            {errorStack && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                  Stack Trace:
                </Typography>
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    p: 1,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: 200,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {errorStack}
                </Typography>
              </Box>
            )}

            {Object.keys(context).length > 0 && (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                  Context:
                </Typography>
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    p: 1,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: 150,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {JSON.stringify(context, null, 2)}
                </Typography>
              </Box>
            )}
          </Box>
        </Collapse>
      )}
    </Alert>
  )
}