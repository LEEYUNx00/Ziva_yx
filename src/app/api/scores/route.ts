import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, teamId, mcId, tiktokTotal, vjScores } = body;

    // Cross-check validation
    let sumVjScores = 0;
    for (const vjId in vjScores) {
      sumVjScores += Number(vjScores[vjId] || 0);
    }

    if (sumVjScores !== Number(tiktokTotal)) {
      return NextResponse.json({ 
        error: 'ยอดคะแนนรวมไม่ตรงกัน', 
        details: `ยอดรวม VJ (${sumVjScores}) ไม่เท่ากับ ยอด TikTok (${tiktokTotal})` 
      }, { status: 400 });
    }

    // 1. Insert Summary
    const summaryId = crypto.randomUUID();
    const { error: summaryError } = await supabase
      .from('daily_summaries')
      .insert([{
        id: summaryId,
        date,
        team_id: teamId,
        tiktok_total: Number(tiktokTotal),
        mc_id: mcId
      }]);

    if (summaryError) throw summaryError;

    // 2. Insert individual scores
    const scoreInserts = [];
    for (const vjId in vjScores) {
      const score = Number(vjScores[vjId] || 0);
      scoreInserts.push({
        id: crypto.randomUUID(),
        date,
        vj_id: vjId,
        mc_id: mcId,
        team_id: teamId,
        score,
        status: 'pending'
      });
    }

    if (scoreInserts.length > 0) {
      const { error: scoresError } = await supabase
        .from('scores')
        .insert(scoreInserts);
      
      if (scoresError) throw scoresError;
    }

    return NextResponse.json({ success: true, message: 'บันทึกคะแนนสำเร็จ' });
  } catch (error: any) {
    console.error('Error saving scores to Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to save scores' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');
    const vjId = searchParams.get('vjId');

    // Fetch Date Range settings from Supabase
    const { data: startSetting } = await supabase.from('settings').select('value').eq('key', 'vj_date_range_start').single();
    const { data: endSetting } = await supabase.from('settings').select('value').eq('key', 'vj_date_range_end').single();

    const startDate = startSetting?.value;
    const endDate = endSetting?.value;

    let query = supabase
      .from('scores')
      .select(`
        *,
        users!vj_id ( name )
      `);

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    if (vjId) {
      query = query.eq('vj_id', vjId);
    }

    // Filter by Date Range settings if they exist
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: scores, error } = await query.order('date', { ascending: false });

    if (error) throw error;

    // Format output to match local DB model name field
    const formattedScores = (scores || []).map((score: any) => ({
      ...score,
      vj_name: score.users?.name
    }));

    return NextResponse.json(formattedScores);
  } catch (error: any) {
    console.error('Error fetching scores from Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch scores' }, { status: 500 });
  }
}
