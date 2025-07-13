import React from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Alert,
  Button,
  Divider
} from '@mui/material'
import {
  Email as EmailIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material'

/**
 * Demo component showing the future email integration workflow
 * This will be implemented in a future version when email parsing is available
 */
export function EmailCallOffDemo() {
  // Mock draft call-off from email
  const mockDraftCallOff = {
    draft_id: 'draft-001',
    counterparty_id: '8914d95f-ca40-4458-844e-5e5b65953b36',
    counterparty_name: 'Acme Corporation',
    email_subject: 'Call-off Request - 50t Copper for July delivery',
    email_body: `Dear Team,

We would like to place a call-off for 50 tonnes of copper bundles for delivery in July 2025.

Please confirm availability and delivery schedule.

Best regards,
John Smith
Acme Corporation`,
    extracted_data: {
      bundle_qty: 50,
      metal_code: 'CU',
      requested_delivery_date: '2025-07-15',
      reference_number: 'ACME-CO-2025-001'
    },
    status: 'PENDING_REVIEW' as const,
    created_at: '2025-07-13T09:30:00Z'
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EmailIcon color="primary" />
        Future Feature: Email-to-Call-Off Workflow
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        This is a preview of the upcoming email integration feature. In the future, call-offs received via email 
        from counterparties will be automatically parsed and presented for review.
      </Alert>

      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" component="div">
              Draft Call-Off from Email
            </Typography>
            <Chip 
              icon={<ScheduleIcon />}
              label="Pending Review" 
              color="warning" 
              variant="outlined" 
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              From: {mockDraftCallOff.counterparty_name}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {mockDraftCallOff.email_subject}
            </Typography>
          </Box>

          <Card variant="outlined" sx={{ mb: 3, bgcolor: 'grey.50' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                {mockDraftCallOff.email_body}
              </Typography>
            </CardContent>
          </Card>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon fontSize="small" />
            Extracted Information
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Bundle Quantity</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {mockDraftCallOff.extracted_data.bundle_qty} tonnes
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Metal Code</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {mockDraftCallOff.extracted_data.metal_code}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Requested Delivery</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {new Date(mockDraftCallOff.extracted_data.requested_delivery_date!).toLocaleDateString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Reference</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {mockDraftCallOff.extracted_data.reference_number}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<CheckCircleIcon />}
              color="primary"
              disabled
            >
              Assign to Quota
            </Button>
            <Button
              variant="outlined"
              disabled
            >
              Request Clarification
            </Button>
            <Button
              variant="outlined"
              color="error"
              disabled
            >
              Reject
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Implementation Roadmap
          </Typography>
          <Box component="ol" sx={{ pl: 2 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              <strong>Email Integration:</strong> Connect to company email system (Exchange/Gmail)
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              <strong>AI Parsing:</strong> Extract call-off details from email content using NLP
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              <strong>Counterparty Recognition:</strong> Identify sender and match to counterparty database
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              <strong>Review Workflow:</strong> Present extracted data for human review and quota assignment
            </Typography>
            <Typography component="li" variant="body2">
              <strong>Auto-conversion:</strong> Convert approved drafts to actual call-offs
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}