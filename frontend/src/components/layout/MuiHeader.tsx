import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  TextField,
  Badge,
  Switch,
  FormControlLabel,
  useTheme,
  InputAdornment,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  Chip,
} from '@mui/material'
import {
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../hooks/useAuth'

function getPageTitle(pathname: string): string {
  switch (pathname) {
    case '/':
    case '/dashboard':
      return 'Dashboard'
    case '/quotas':
      return 'Quotas'
    case '/call-offs':
      return 'Call-Offs'
    case '/call-offs/create':
      return 'Create Call-Off'
    case '/transport':
      return 'Transport Orders'
    case '/inventory':
      return 'Inventory'
    case '/profile':
      return 'Profile Settings'
    default:
      return 'Dashboard'
  }
}

interface MuiHeaderProps {
  title?: string
}

export function MuiHeader({ title }: MuiHeaderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const muiTheme = useTheme()
  const { theme, toggleTheme } = useCustomTheme()
  const { user, logout } = useAuth()
  const pageTitle = title || getPageTitle(location.pathname)
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleProfile = () => {
    navigate('/profile')
    handleClose()
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    handleClose()
  }

  return (
    <AppBar
      position="fixed"
      elevation={1}
      data-testid="app-header"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: muiTheme.palette.background.paper,
        color: muiTheme.palette.text.primary,
        borderBottom: `1px solid ${muiTheme.palette.divider}`,
        boxShadow: 'none',
        backdropFilter: 'blur(20px)',
        backgroundColor: muiTheme.palette.mode === 'dark' 
          ? 'rgba(30, 41, 59, 0.8)' 
          : 'rgba(255, 255, 255, 0.8)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Left side - Page title */}
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }} data-testid="page-title">
            {pageTitle}
          </Typography>
        </Box>

        {/* Center - Search */}
        <Box sx={{ flexGrow: 1, maxWidth: 500, mx: 4 }}>
          <TextField
            placeholder="Search quotas, call-offs, orders..."
            variant="outlined"
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              sx: {
                bgcolor: muiTheme.palette.action.hover,
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  border: 'none',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  border: `2px solid ${muiTheme.palette.primary.main}`,
                },
              },
            }}
          />
        </Box>

        {/* Right side - Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Theme toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={theme === 'dark'}
                onChange={toggleTheme}
                icon={<LightModeIcon />}
                checkedIcon={<DarkModeIcon />}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: muiTheme.palette.primary.main,
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: muiTheme.palette.primary.main,
                  },
                }}
              />
            }
            label=""
            sx={{ mr: 1 }}
          />

          {/* Notifications */}
          <IconButton
            size="medium"
            sx={{
              color: muiTheme.palette.text.secondary,
              '&:hover': {
                bgcolor: muiTheme.palette.action.hover,
              },
            }}
          >
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* User Menu */}
          {user && (
            <>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  p: 1,
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: muiTheme.palette.action.hover,
                  },
                }}
                onClick={handleMenu}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: muiTheme.palette.primary.main,
                    fontSize: '1rem',
                    mr: 1,
                  }}
                >
                  {user.profile?.display_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {user.profile?.display_name || user.email}
                  </Typography>
                  {user.profile?.role && (
                    <Chip
                      label={user.profile.role}
                      size="small"
                      sx={{ height: 18, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              </Box>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={handleProfile}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  Profile Settings
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  )
}