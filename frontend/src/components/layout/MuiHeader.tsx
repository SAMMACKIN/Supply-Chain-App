import { useLocation } from 'react-router-dom'
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
} from '@mui/material'
import {
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material'
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext'

function getPageTitle(pathname: string): string {
  switch (pathname) {
    case '/':
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
    default:
      return 'Dashboard'
  }
}

interface MuiHeaderProps {
  title?: string
}

export function MuiHeader({ title }: MuiHeaderProps) {
  const location = useLocation()
  const muiTheme = useTheme()
  const { theme, toggleTheme } = useCustomTheme()
  const pageTitle = title || getPageTitle(location.pathname)

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
        </Box>
      </Toolbar>
    </AppBar>
  )
}