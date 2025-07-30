import React from 'react'
import { createPortal } from 'react-dom'
import {
  Box,
  CircularProgress,
  Typography,
  Backdrop,
  Paper
} from '@mui/material'

export interface LoadingOverlayProps {
  open: boolean
  message?: string
  backdrop?: boolean
  blur?: boolean
  container?: Element | null
  size?: number
  variant?: 'circular' | 'linear'
}

export function LoadingOverlay({
  open,
  message = 'Loading...',
  backdrop = true,
  blur = false,
  container,
  size = 40,
  variant = 'circular'
}: LoadingOverlayProps) {
  if (!open) return null

  const overlayContent = (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: (theme) => theme.zIndex.modal + 1,
        pointerEvents: 'all', // Prevent interaction with underlying elements
        ...(backdrop && {
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }),
        ...(blur && {
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        })
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-overlay-message"
    >
      <Paper
        elevation={3}
        sx={{
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          borderRadius: 2,
          minWidth: 200
        }}
      >
        <CircularProgress
          size={size}
          thickness={4}
          sx={{ color: 'primary.main' }}
        />
        {message && (
          <Typography
            id="loading-overlay-message"
            variant="body1"
            color="text.secondary"
            textAlign="center"
          >
            {message}
          </Typography>
        )}
      </Paper>
    </Box>
  )

  const containerOverlayContent = (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        pointerEvents: 'all',
        ...(backdrop && {
          backgroundColor: 'rgba(255, 255, 255, 0.8)'
        }),
        ...(blur && {
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)'
        })
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="container-loading-overlay-message"
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          p: 2,
          backgroundColor: 'background.paper',
          borderRadius: 1,
          boxShadow: 1
        }}
      >
        <CircularProgress
          size={size}
          thickness={4}
          sx={{ color: 'primary.main' }}
        />
        {message && (
          <Typography
            id="container-loading-overlay-message"
            variant="body2"
            color="text.secondary"
            textAlign="center"
          >
            {message}
          </Typography>
        )}
      </Box>
    </Box>
  )

  // If container is specified, render overlay within that container
  if (container) {
    return createPortal(containerOverlayContent, container)
  }

  // Default: render as full-screen overlay
  return createPortal(overlayContent, document.body)
}

// Convenience component for loading state within a specific container
export interface ContainerLoadingProps {
  loading: boolean
  message?: string
  children: React.ReactNode
  blur?: boolean
  size?: number
}

export function ContainerLoading({
  loading,
  message,
  children,
  blur = false,
  size = 32
}: ContainerLoadingProps) {
  return (
    <Box sx={{ position: 'relative' }}>
      {children}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1,
            ...(blur && {
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)'
            })
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="container-loading-message"
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1
            }}
          >
            <CircularProgress size={size} thickness={4} />
            {message && (
              <Typography
                id="container-loading-message"
                variant="body2"
                color="text.secondary"
                textAlign="center"
              >
                {message}
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}