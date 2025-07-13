import type { ReactNode } from 'react'
import { Box, Container, useTheme } from '@mui/material'
import { MuiSidebar } from './MuiSidebar'
import { MuiHeader } from './MuiHeader'

interface MuiLayoutProps {
  children: ReactNode
  title?: string
}

export function MuiLayout({ children, title }: MuiLayoutProps) {
  const theme = useTheme()

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.background.default }}>
      <MuiSidebar />
      <Box
        component="main"
        data-testid="main-content"
        sx={{
          flexGrow: 1,
          minWidth: 0, // Prevent flex overflow
        }}
      >
        <MuiHeader title={title} />
        <Box
          sx={{
            mt: 8, // Account for AppBar height
            pt: 3,
            pb: 3,
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <Container maxWidth="xl" sx={{ px: 3 }}>
            {children}
          </Container>
        </Box>
      </Box>
    </Box>
  )
}