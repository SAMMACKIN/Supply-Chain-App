import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Box,
  Divider,
  Avatar,
  Chip,
  useTheme,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Assignment as QuotasIcon,
  Description as CallOffsIcon,
  LocalShipping as TransportIcon,
  Inventory as InventoryIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
} from '@mui/icons-material'

const navigation = [
  { name: 'Dashboard', href: '/', icon: DashboardIcon, testid: 'nav-dashboard' },
  { name: 'Quotas', href: '/quotas', icon: QuotasIcon, testid: 'nav-quotas' },
  { name: 'Call-Offs', href: '/call-offs', icon: CallOffsIcon, testid: 'nav-call-offs' },
  { name: 'Transport Orders', href: '/transport', icon: TransportIcon, testid: 'nav-transport' },
  { name: 'Inventory', href: '/inventory', icon: InventoryIcon, testid: 'nav-inventory' },
]

const drawerWidth = 280
const collapsedWidth = 64

interface MuiSidebarProps {
  open?: boolean
  onToggle?: () => void
}

export function MuiSidebar({ open = true, onToggle }: MuiSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const location = useLocation()
  const theme = useTheme()

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed)
    onToggle?.()
  }

  const currentWidth = isCollapsed ? collapsedWidth : drawerWidth

  return (
    <Drawer
      variant="permanent"
      data-testid="app-sidebar"
      sx={{
        width: currentWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: currentWidth,
          boxSizing: 'border-box',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowX: 'hidden',
          background: theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          p: 2,
          minHeight: 64,
        }}
      >
        {!isCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{
                bgcolor: theme.palette.primary.main,
                width: 32,
                height: 32,
              }}
            >
              <InventoryIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              Supply Chain
            </Typography>
          </Box>
        )}
        <IconButton onClick={handleToggle} size="small">
          {isCollapsed ? <MenuIcon /> : <CloseIcon />}
        </IconButton>
      </Box>

      <Divider />

      {/* Navigation */}
      <List sx={{ pt: 2, px: 1 }}>
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href

          return (
            <ListItem key={item.name} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.href}
                data-testid={item.testid}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  minHeight: 48,
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  backgroundColor: isActive ? theme.palette.primary.main : 'transparent',
                  color: isActive ? theme.palette.primary.contrastText : theme.palette.text.primary,
                  '&:hover': {
                    backgroundColor: isActive 
                      ? theme.palette.primary.dark 
                      : theme.palette.action.hover,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: isCollapsed ? 0 : 3,
                    justifyContent: 'center',
                    color: isActive ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                  }}
                >
                  <Icon />
                </ListItemIcon>
                {!isCollapsed && (
                  <ListItemText 
                    primary={item.name}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      {/* Footer */}
      <Box sx={{ mt: 'auto', p: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: 1,
          }}
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.secondary.main }}>
            U
          </Avatar>
          {!isCollapsed && (
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Operations User
              </Typography>
              <Chip
                label="Active"
                size="small"
                color="success"
                sx={{ height: 16, fontSize: '0.6rem' }}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  )
}