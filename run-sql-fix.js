const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function runSQLFix() {
  // Initialize Supabase client with service role key
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ACCESS_TOKEN,
    {
      auth: {
        persistSession: false
      }
    }
  );

  // Read the SQL file
  const sqlContent = fs.readFileSync('fix_user_profiles_corrected.sql', 'utf8');

  console.log('Running SQL fix script...');
  console.log('Database URL:', process.env.SUPABASE_URL);

  try {
    // Split the SQL content by semicolons to execute statements separately
    const statements = sqlContent
      .split(/;\s*(?=DO\s+\$\$|SELECT|CREATE|$)/g)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement.trim()) continue;

      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
      
      // For DO blocks, add the semicolon back
      const finalStatement = statement.endsWith(';') ? statement : statement + ';';
      
      const { data, error } = await supabase.rpc('exec_sql', {
        query: finalStatement
      });

      if (error) {
        console.error(`Error in statement ${i + 1}:`, error);
        // Try alternative approach - direct database query
        console.log('Trying alternative approach...');
        
        // Since we can't use rpc, let's create a simpler fix
        if (statement.includes('user_role_enum')) {
          console.log('This statement creates the enum type - manual intervention may be needed');
        }
      } else {
        console.log(`Statement ${i + 1} executed successfully`);
        if (data) console.log('Result:', data);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the fix
runSQLFix().catch(console.error);