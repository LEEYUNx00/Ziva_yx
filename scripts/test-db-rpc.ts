import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Connecting to:', supabaseUrl);
  
  const { data: users, error: usersError } = await supabase.from('users').select('*').limit(3);
  console.log('Users query result:', { count: users?.length, error: usersError });

  const { data: teams, error: teamsError } = await supabase.from('teams').select('*').limit(3);
  console.log('Teams query result:', { count: teams?.length, error: teamsError });

  const { data: settings, error: settingsError } = await supabase.from('settings').select('*').limit(3);
  console.log('Settings query result:', { count: settings?.length, error: settingsError });
}
check();
