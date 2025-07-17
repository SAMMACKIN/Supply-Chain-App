import { useMemo, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
import { CallOffDetailView } from '../components/CallOff/CallOffDetailView'
import { EditCallOffDialog } from '../components/CallOff/EditCallOffDialog'
import { fetchCallOffs } from '../services/calloff-api'
import type { CallOff } from '../types/calloff'

export function MuiCallOffs() {
  const location = useLocation()
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [selectedCallOff, setSelectedCallOff] = useState<CallOff | null>(null)
  const [showDetailView, setShowDetailView] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  
  // Get the selected call-off ID from navigation state
  const selectedCallOffId = location.state?.selectedCallOffId
  
  // Fetch call-offs to find the selected one
  const { data: callOffs } = useQuery({
    queryKey: ['call-offs'],
    queryFn: fetchCallOffs,
    enabled: !!selectedCallOffId
  })
  
  // Auto-open the detail view if navigated with a selected call-off
  useEffect(() => {
    if (selectedCallOffId && callOffs) {
      const callOff = callOffs.find(co => co.call_off_id === selectedCallOffId)
      if (callOff) {
        setSelectedCallOff(callOff)
        setShowDetailView(true)
        // Clear the state to prevent re-opening on refresh
        window.history.replaceState({}, document.title)
      }
    }
  }, [selectedCallOffId, callOffs])

  const handleViewCallOff = (callOff: CallOff) => {
    setSelectedCallOff(callOff)
    setShowDetailView(true)
  }

  const handleEditCallOff = (callOff: CallOff) => {
    setSelectedCallOff(callOff)
    setShowEditDialog(true)
  }

  const handleCloseDetailView = () => {
    setShowDetailView(false)
    setSelectedCallOff(null)
  }

  const handleCloseEditDialog = () => {
    setShowEditDialog(false)
    setSelectedCallOff(null)
  }

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
        <CallOffList 
          onViewCallOff={handleViewCallOff}
          onEditCallOff={handleEditCallOff}
        />
      </div>

      {/* Create Call-Off Wizard */}
      <CreateCallOffWizard 
        open={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        onSuccess={(callOff) => {
          setShowCreateWizard(false)
          setSelectedCallOff(callOff)
          setShowDetailView(true)
        }}
      />

      {/* Call-Off Detail View */}
      {selectedCallOff && (
        <CallOffDetailView
          callOff={selectedCallOff}
          open={showDetailView}
          onClose={handleCloseDetailView}
          onEdit={handleEditCallOff}
        />
      )}

      {/* Edit Call-Off Dialog */}
      {selectedCallOff && (
        <EditCallOffDialog
          callOff={selectedCallOff}
          open={showEditDialog}
          onClose={handleCloseEditDialog}
        />
      )}

    </Box>
  )
}