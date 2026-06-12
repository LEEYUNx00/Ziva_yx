import { NextResponse } from 'next/server';
import { supabase, logActionSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: settingsList, error } = await supabase
      .from('settings')
      .select('key, value');

    if (error) throw error;

    // Convert array of objects to key-value object
    const settings = (settingsList || []).reduce((acc: any, item: any) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error fetching settings from Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vj_date_range_start, vj_date_range_end, adminId } = body;

    if (!adminId) {
      return NextResponse.json({ error: 'Missing admin ID' }, { status: 400 });
    }

    const updates = [];
    if (vj_date_range_start) {
      updates.push({ key: 'vj_date_range_start', value: vj_date_range_start });
    }
    if (vj_date_range_end) {
      updates.push({ key: 'vj_date_range_end', value: vj_date_range_end });
    }

    if (updates.length > 0) {
      const { error } = await supabase
        .from('settings')
        .upsert(updates);
      
      if (error) throw error;
    }

    await logActionSupabase(
      adminId,
      'UPDATE_SETTINGS',
      `Updated VJ Date Range to ${vj_date_range_start || 'N/A'} - ${vj_date_range_end || 'N/A'}`
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving settings to Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to save settings' }, { status: 500 });
  }
}
