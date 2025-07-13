import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2'

interface AuthResult {
  success: boolean
  error?: string
  supabase?: SupabaseClient
  user?: User
}

export class AuthMiddleware {
  static async authenticate(req: Request): Promise<AuthResult> {
    try {
      // Get Supabase URL and service role key from environment
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (!supabaseUrl || !supabaseServiceKey) {
        return {
          success: false,
          error: 'Missing Supabase configuration'
        }
      }

      // Extract authorization header
      const authHeader = req.headers.get('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          success: false,
          error: 'Missing or invalid authorization header'
        }
      }

      const token = authHeader.substring(7) // Remove 'Bearer ' prefix

      // Create Supabase client with service role for RLS bypass when needed
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
      
      // Create user-scoped client for RLS enforcement
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      })

      // Verify the user token
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      
      if (error || !user) {
        return {
          success: false,
          error: 'Invalid authentication token'
        }
      }

      // Check if user has an active profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profile) {
        return {
          success: false,
          error: 'User profile not found or access denied'
        }
      }

      // Check if user role allows API access
      if (!['OPS', 'TRADE', 'PLANNER'].includes(profile.role)) {
        return {
          success: false,
          error: 'Insufficient role permissions'
        }
      }

      return {
        success: true,
        supabase: supabaseClient,
        user: {
          ...user,
          profile: profile
        }
      }

    } catch (error) {
      console.error('Authentication error:', error)
      return {
        success: false,
        error: 'Authentication failed'
      }
    }
  }

  static hasRole(user: any, requiredRoles: string[]): boolean {
    return user.profile && requiredRoles.includes(user.profile.role)
  }

  static canCreateCallOff(user: any): boolean {
    return this.hasRole(user, ['OPS', 'TRADE'])
  }

  static canConfirmCallOff(user: any): boolean {
    return this.hasRole(user, ['OPS', 'TRADE'])
  }

  static canCancelCallOff(user: any): boolean {
    return this.hasRole(user, ['OPS', 'TRADE', 'PLANNER'])
  }

  static canUpdateCallOff(user: any): boolean {
    return this.hasRole(user, ['OPS', 'TRADE'])
  }
}