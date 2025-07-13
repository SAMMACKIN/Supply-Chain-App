import { useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Chip,
  useTheme,
} from '@mui/material'
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import { CreateCallOffWizard } from '../components/CallOff/CreateCallOffWizard'
import { CallOffList } from '../components/CallOff/CallOffList'

export function MuiCallOffs() {
  const [showCreateWizard, setShowCreateWizard] = useState(false)

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Call-Offs
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage call-off orders against customer quotas
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateWizard(true)}
          sx={{ borderRadius: 2 }}
          data-testid="create-call-off-button"
        >
          Create Call-Off
        </Button>
      </Box>


      {/* Call-offs List */}
      <div data-testid="call-offs-table">
        <CallOffList />
      </div>

      {/* Create Call-Off Wizard */}
      <CreateCallOffWizard 
        open={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
      />
    </Box>
  )
}