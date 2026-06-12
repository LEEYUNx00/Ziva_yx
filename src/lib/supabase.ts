import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Log action helper for Supabase
export async function logActionSupabase(adminId: string, action: string, details: string) {
  try {
    const id = crypto.randomUUID();
    const { error } = await supabase
      .from('audit_logs')
      .insert([{ id, admin_id: adminId, action, details }]);
    
    if (error) {
      console.error('Failed to write audit log to Supabase:', error);
    }
  } catch (err) {
    console.error('Failed to write audit log to Supabase:', err);
  }
}
