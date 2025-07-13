import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Container,
  Divider,
  Avatar,
  Card,
  CardContent,
  Grid,
  Chip
} from '@mui/material'
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import type { UserProfile } from '../types/auth'

const profileSchema = z.object({
  display_name: z.string().min(2, 'Display name must be at least 2 characters'),
  business_unit: z.string().min(1, 'Business unit is required')
})

type ProfileFormData = z.infer<typeof profileSchema>

export function ProfileSettings() {
  const { user, logout } = useAuth()
  const { profile, updateProfile, updating, error: profileError } = useProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile?.display_name || '',
      business_unit: profile?.business_unit || ''
    }
  })
  
  const onSubmit = async (data: ProfileFormData) => {
    setError(null)
    setSuccess(false)
    
    try {
      await updateProfile(data)
      setSuccess(true)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    }
  }
  
  const handleCancel = () => {
    reset({
      display_name: profile?.display_name || '',
      business_unit: profile?.business_unit || ''
    })
    setIsEditing(false)
    setError(null)
  }
  
  const handleLogout = async () => {
    try {
      await logout()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log out')
    }
  }
  
  if (!user || !profile) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }
  
  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Profile Settings
        </Typography>
        
        {(error || profileError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || profileError}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Profile updated successfully!
          </Alert>
        )}
        
        <Grid container spacing={3}>
          {/* Profile Overview Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    margin: '0 auto',
                    mb: 2,
                    bgcolor: 'primary.main',
                    fontSize: '2.5rem'
                  }}
                >
                  {profile.display_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  {profile.display_name || user.email}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {user.email}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={profile.role}
                    color="primary"
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {profile.business_unit}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Profile Details Card */}
          <Grid item xs={12} md={8}>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  Profile Information
                </Typography>
                {!isEditing && (
                  <Button
                    startIcon={<EditIcon />}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                )}
              </Box>
              
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      {...register('display_name')}
                      fullWidth
                      label="Display Name"
                      disabled={!isEditing}
                      error={!!errors.display_name}
                      helperText={errors.display_name?.message}
                      InputProps={{
                        startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      {...register('business_unit')}
                      fullWidth
                      label="Business Unit"
                      disabled={!isEditing}
                      error={!!errors.business_unit}
                      helperText={errors.business_unit?.message}
                      InputProps={{
                        startAdornment: <BusinessIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      value={user.email}
                      disabled
                      InputProps={{
                        startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Role"
                      value={profile.role}
                      disabled
                      helperText="Contact an administrator to change your role"
                      InputProps={{
                        startAdornment: <SecurityIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>
                </Grid>
                
                {isEditing && (
                  <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={updating}
                    >
                      {updating ? <CircularProgress size={24} /> : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={handleCancel}
                      disabled={updating}
                    >
                      Cancel
                    </Button>
                  </Box>
                )}
              </Box>
              
              <Divider sx={{ my: 3 }} />
              
              <Box>
                <Typography variant="h6" gutterBottom>
                  Account Information
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  User ID: {user.id}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Member since: {new Date(profile.created_at).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Last updated: {new Date(profile.updated_at).toLocaleDateString()}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 3 }} />
              
              <Box>
                <Typography variant="h6" gutterBottom color="error">
                  Danger Zone
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleLogout}
                >
                  Log Out
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  )
}