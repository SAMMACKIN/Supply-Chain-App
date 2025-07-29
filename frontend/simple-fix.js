import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pxwtdaqhwzweedflwora.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d3RkYXFod3p3ZWVkZmx3b3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMjI4OTYsImV4cCI6MjA2Nzg5ODg5Nn0.1ILHILy2_YCZ_uqRJIN7WvVhD1PP3vgZT5g3xmxGSiM';

async function simpleFix() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    // First, try a minimal insert with only required fields
    console.log('Attempting to create user profile with minimal fields...');
    
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: '33335e78-ff0b-4826-9b9b-3a35894bd655'
      })
      .select();

    if (error) {
      console.error('Error with minimal insert:', error);
      
      // Try with more fields
      console.log('\nTrying with additional fields...');
      const { data: data2, error: error2 } = await supabase
        .from('user_profiles')
        .insert({
          user_id: '33335e78-ff0b-4826-9b9b-3a35894bd655',
          email: 'admin@example.com',
          role: 'OPS',
          warehouse_ids: []
        })
        .select();
        
      if (error2) {
        console.error('Error with additional fields:', error2);
        
        // Try without role enum
        console.log('\nTrying without role field...');
        const { data: data3, error: error3 } = await supabase
          .from('user_profiles')
          .insert({
            user_id: '33335e78-ff0b-4826-9b9b-3a35894bd655',
            email: 'admin@example.com',
            warehouse_ids: []
          })
          .select();
          
        if (error3) {
          console.error('Error without role:', error3);
        } else {
          console.log('Success without role:', data3);
        }
      } else {
        console.log('Success with additional fields:', data2);
      }
    } else {
      console.log('Success with minimal fields:', data);
    }
    
    // Check what we have now
    console.log('\nChecking current profile...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', '33335e78-ff0b-4826-9b9b-3a35894bd655')
      .single();
      
    if (profileError) {
      console.error('Error fetching profile:', profileError);
    } else {
      console.log('Current profile:', profile);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

simpleFix().catch(console.error);