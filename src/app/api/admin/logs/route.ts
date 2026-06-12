import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        users!admin_id ( name )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const formattedLogs = (logs || []).map((log: any) => ({
      ...log,
      admin_name: log.users?.name
    }));

    return NextResponse.json(formattedLogs);
  } catch (error: any) {
    console.error('Error fetching audit logs from Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch audit logs' }, { status: 500 });
  }
}
