import { NextResponse } from 'next/server';
import { supabase, logActionSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function resolveAdminId(adminId: string): Promise<string> {
  if (adminId === 'admin-1') {
    const { data: adminUser } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'ADMIN')
      .limit(1)
      .maybeSingle();
    if (adminUser) {
      return adminUser.id;
    }
  }
  return adminId;
}

// Edit VJ cycle totals
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { vjId, teamId, confirmed, pending, disputed, startDate, endDate, adminId } = body;

    if (!vjId || !teamId || !startDate || !endDate || !adminId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const activeAdminId = await resolveAdminId(adminId);

    // 1. Fetch VJ Name for logging
    const { data: user } = await supabase.from('users').select('name').eq('id', vjId).single();
    const vjName = user?.name || 'VJ';

    // 2. Delete all existing scores for this VJ in the date range [startDate, endDate]
    const { error: scoreDeleteError } = await supabase
      .from('scores')
      .delete()
      .eq('vj_id', vjId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (scoreDeleteError) throw scoreDeleteError;

    // 3. Insert new consolidated scores on the endDate
    const scoreInserts = [];
    if (confirmed > 0) {
      scoreInserts.push({
        id: crypto.randomUUID(),
        date: endDate,
        vj_id: vjId,
        mc_id: activeAdminId,
        team_id: teamId,
        score: Math.round(confirmed),
        status: 'confirmed'
      });
    }

    if (pending > 0) {
      scoreInserts.push({
        id: crypto.randomUUID(),
        date: endDate,
        vj_id: vjId,
        mc_id: activeAdminId,
        team_id: teamId,
        score: Math.round(pending),
        status: 'pending'
      });
    }

    if (disputed > 0) {
      scoreInserts.push({
        id: crypto.randomUUID(),
        date: endDate,
        vj_id: vjId,
        mc_id: activeAdminId,
        team_id: teamId,
        score: Math.round(disputed),
        status: 'disputed'
      });
    }

    if (scoreInserts.length > 0) {
      const { error: scoresInsertError } = await supabase
        .from('scores')
        .insert(scoreInserts);
      if (scoresInsertError) throw scoresInsertError;
    }

    // 4. Recalculate team total score on the endDate for Daily Summary alignment
    const { data: teamScores } = await supabase
      .from('scores')
      .select('score')
      .eq('team_id', teamId)
      .eq('date', endDate);

    const newTeamTotal = (teamScores || []).reduce((sum, item) => sum + item.score, 0);

    // Delete existing daily summaries for this team in the date range [startDate, endDate]
    const { error: summaryDeleteError } = await supabase
      .from('daily_summaries')
      .delete()
      .eq('team_id', teamId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (summaryDeleteError) throw summaryDeleteError;

    if (newTeamTotal > 0) {
      // Insert new summary on the endDate
      const { error: summaryInsertError } = await supabase
        .from('daily_summaries')
        .insert([{
          id: crypto.randomUUID(),
          date: endDate,
          team_id: teamId,
          tiktok_total: Math.round(newTeamTotal),
          mc_id: activeAdminId
        }]);

      if (summaryInsertError) throw summaryInsertError;
    }

    // 5. Log action
    await logActionSupabase(
      activeAdminId,
      'EDIT_CYCLE_SCORES',
      `Edited billing cycle scores for VJ ${vjName} in team ID ${teamId}. Confirmed: ${confirmed}, Pending: ${pending}, Disputed: ${disputed}`
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating cycle scores:', error);
    return NextResponse.json({ error: error.message || 'Failed to update cycle scores' }, { status: 500 });
  }
}

// Delete VJ cycle scores
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vjId = searchParams.get('vjId');
    const teamId = searchParams.get('teamId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const adminId = searchParams.get('adminId');

    if (!vjId || !teamId || !startDate || !endDate || !adminId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const activeAdminId = await resolveAdminId(adminId);

    // 1. Fetch VJ Name for logging
    const { data: user } = await supabase.from('users').select('name').eq('id', vjId).single();
    const vjName = user?.name || 'VJ';

    // 2. Delete all existing scores for this VJ in the date range [startDate, endDate]
    const { error: scoreDeleteError } = await supabase
      .from('scores')
      .delete()
      .eq('vj_id', vjId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (scoreDeleteError) throw scoreDeleteError;

    // 3. Recalculate team total score on the endDate for Daily Summary alignment
    const { data: teamScores } = await supabase
      .from('scores')
      .select('score')
      .eq('team_id', teamId)
      .eq('date', endDate);

    const newTeamTotal = (teamScores || []).reduce((sum, item) => sum + item.score, 0);

    // Delete existing daily summaries for this team in the date range [startDate, endDate]
    const { error: summaryDeleteError } = await supabase
      .from('daily_summaries')
      .delete()
      .eq('team_id', teamId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (summaryDeleteError) throw summaryDeleteError;

    if (newTeamTotal > 0) {
      // Insert new summary on the endDate
      const { error: summaryInsertError } = await supabase
        .from('daily_summaries')
        .insert([{
          id: crypto.randomUUID(),
          date: endDate,
          team_id: teamId,
          tiktok_total: Math.round(newTeamTotal),
          mc_id: activeAdminId
        }]);

      if (summaryInsertError) throw summaryInsertError;
    }

    // 4. Log action
    await logActionSupabase(
      activeAdminId,
      'DELETE_CYCLE_SCORES',
      `Deleted all billing cycle scores for VJ ${vjName} in team ID ${teamId} for range ${startDate} - ${endDate}`
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting cycle scores:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete cycle scores' }, { status: 500 });
  }
}
