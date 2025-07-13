import { useState } from 'react'
import { Box, Typography, Button } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { QueryProvider } from '../providers/QueryProvider'
import { CreateCallOffFormMUI } from '../components/CallOff/CreateCallOffFormMUI'
import { CallOffList } from '../components/CallOff/CallOffList'
import { CallOffDetailView } from '../components/CallOff/CallOffDetailView'
import type { CallOff } from '../types/calloff'

export function SimpleCallOffs() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedCallOff, setSelectedCallOff] = useState<CallOff | null>(null)
  const [showDetailView, setShowDetailView] = useState(false)
  const [viewingCallOff, setViewingCallOff] = useState<CallOff | null>(null)

  const handleCreateSuccess = () => {
    setShowCreateForm(false)
    setSelectedCallOff(null)
  }

  const handleViewCallOff = (callOff: CallOff) => {
    setViewingCallOff(callOff)
    setShowDetailView(true)
  }

  const handleEditCallOff = (callOff: CallOff) => {
    setSelectedCallOff(callOff)
    setShowCreateForm(true)
  }

  const handleEditFromDetail = (callOff: CallOff) => {
    setSelectedCallOff(callOff)
    setShowCreateForm(true)
    setShowDetailView(false)
  }

  if (showCreateForm) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => {
            setShowCreateForm(false)
            setSelectedCallOff(null)
          }}
          sx={{ mb: 3 }}
        >
          Back to Call-Offs
        </Button>
        
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
          {selectedCallOff ? 'Edit Call-Off' : 'Create New Call-Off'}
        </Typography>

        <QueryProvider>
          <CreateCallOffFormMUI
            onSuccess={handleCreateSuccess}
            onCancel={() => {
              setShowCreateForm(false)
              setSelectedCallOff(null)
            }}
            initialQuotaId={selectedCallOff?.quota_id}
            editingCallOff={selectedCallOff}
          />
        </QueryProvider>
      </Box>
    )
  }

  return (
    <QueryProvider>
      <CallOffList
        onCreateCallOff={() => setShowCreateForm(true)}
        onViewCallOff={handleViewCallOff}
        onEditCallOff={handleEditCallOff}
      />
      
      {/* Call-Off Detail View Modal */}
      {viewingCallOff && (
        <CallOffDetailView
          callOff={viewingCallOff}
          open={showDetailView}
          onClose={() => {
            setShowDetailView(false)
            setViewingCallOff(null)
          }}
          onEdit={handleEditFromDetail}
        />
      )}
    </QueryProvider>
  )
}