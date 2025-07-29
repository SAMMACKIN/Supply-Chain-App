import { createClient } from '@supabase/supabase-js';

// Hardcode the environment variables for now
const SUPABASE_URL = 'https://pxwtdaqhwzweedflwora.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d3RkYXFod3p3ZWVkZmx3b3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMjI4OTYsImV4cCI6MjA2Nzg5ODg5Nn0.1ILHILy2_YCZ_uqRJIN7WvVhD1PP3vgZT5g3xmxGSiM';

async function runSQLFix() {
  console.log('Initializing Supabase connection...');
  console.log('URL:', SUPABASE_URL);
  
  // Since we can't execute arbitrary SQL via the JS client, let's create a simpler fix
  // that uses the Supabase client methods
  
  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  try {
    // First, let's check if we can query the user_profiles table
    console.log('\nChecking user_profiles table...');
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (profileError) {
      console.error('Error accessing user_profiles:', profileError);
    } else {
      console.log('user_profiles table accessible');
    }

    // Check for the specific user
    console.log('\nChecking for user 33335e78-ff0b-4826-9b9b-3a35894bd655...');
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', '33335e78-ff0b-4826-9b9b-3a35894bd655')
      .single();

    if (userError && userError.code === 'PGRST116') {
      console.log('User profile not found. Creating...');
      
      // Try to create the profile with minimal required fields
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: '33335e78-ff0b-4826-9b9b-3a35894bd655',
          display_name: 'Admin User',
          email: 'admin@example.com',
          role: 'ADMIN',
          warehouse_ids: []
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        
        // If role enum is the issue, try with a different role
        if (createError.message.includes('user_role_enum') || createError.message.includes('UserRole')) {
          console.log('\nTrying with OPS role instead...');
          const { data: opsProfile, error: opsError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: '33335e78-ff0b-4826-9b9b-3a35894bd655',
              display_name: 'Admin User',
              email: 'admin@example.com',
              role: 'OPS',
              warehouse_ids: []
            })
            .select()
            .single();

          if (opsError) {
            console.error('Error with OPS role:', opsError);
          } else {
            console.log('Profile created successfully with OPS role:', opsProfile);
          }
        }
      } else {
        console.log('Profile created successfully:', newProfile);
      }
    } else if (userProfile) {
      console.log('User profile already exists:', userProfile);
    } else {
      console.error('Unexpected error:', userError);
    }

    // Check all users without profiles
    console.log('\nChecking for users without profiles...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Cannot list auth users (requires service role key)');
    } else if (authUsers) {
      console.log(`Found ${authUsers.users.length} auth users`);
      
      // Check which ones have profiles
      const { data: existingProfiles } = await supabase
        .from('user_profiles')
        .select('user_id');
      
      const existingUserIds = new Set(existingProfiles?.map(p => p.user_id) || []);
      const usersWithoutProfiles = authUsers.users.filter(u => !existingUserIds.has(u.id));
      
      console.log(`${usersWithoutProfiles.length} users without profiles`);
      
      // Create profiles for users without them
      for (const user of usersWithoutProfiles) {
        console.log(`Creating profile for ${user.email}...`);
        const { error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            display_name: user.user_metadata?.display_name || user.email.split('@')[0],
            email: user.email,
            role: user.user_metadata?.role || 'OPS',
            warehouse_ids: []
          });
        
        if (createError) {
          console.error(`Failed to create profile for ${user.email}:`, createError.message);
        }
      }
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the fix
runSQLFix().catch(console.error);