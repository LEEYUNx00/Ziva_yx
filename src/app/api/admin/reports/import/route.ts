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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rows, startDate, endDate, adminId } = body;

    if (!rows || !Array.isArray(rows) || !startDate || !endDate || !adminId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const activeAdminId = await resolveAdminId(adminId);

    let newUsersCount = 0;
    
    // We will group the team imports to create consolidated daily summaries on the endDate
    const teamTotalScores: Record<string, number> = {};

    // 1. Process each row sequentially to manage user/team creation and links
    for (const row of rows) {
      const { name, teamName, confirmed, pending, disputed } = row;
      if (!name || !name.trim()) continue;

      const cleanName = name.trim();
      const cleanTeamName = (teamName || '').trim() || 'General';

      // 1.1 Find or create Team
      let teamId = '';
      const { data: teamData, error: teamFetchError } = await supabase
        .from('teams')
        .select('id')
        .eq('name', cleanTeamName)
        .maybeSingle();

      if (teamFetchError) throw teamFetchError;

      if (!teamData) {
        teamId = 'team-' + crypto.randomUUID().substring(0, 8);
        const { error: teamInsertError } = await supabase
          .from('teams')
          .insert([{ id: teamId, name: cleanTeamName, shift: 'เช้า' }]);
        if (teamInsertError) throw teamInsertError;
      } else {
        teamId = teamData.id;
      }

      // 1.2 Find or create VJ
      let vjId = '';
      const { data: vjData, error: vjFetchError } = await supabase
        .from('users')
        .select('id')
        .eq('name', cleanName)
        .eq('role', 'VJ')
        .maybeSingle();

      if (vjFetchError) throw vjFetchError;

      if (!vjData) {
        // Create VJ user
        vjId = 'vj-' + crypto.randomUUID().substring(0, 8);
        const nameClean = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        const tempUsername = `temp_vj_${nameClean}_${randomSuffix}`;

        const { error: userInsertError } = await supabase
          .from('users')
          .insert([{
            id: vjId,
            username: tempUsername,
            password: 'vj' + randomSuffix,
            name: cleanName,
            role: 'VJ'
          }]);

        if (userInsertError) throw userInsertError;
        newUsersCount++;
      } else {
        vjId = vjData.id;
      }

      // 1.3 Ensure VJ is linked to the team
      const { data: linkData, error: linkFetchError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', vjId)
        .maybeSingle();

      if (linkFetchError) throw linkFetchError;

      if (!linkData) {
        const memberId = 'tm-' + crypto.randomUUID().substring(0, 8);
        const { error: linkInsertError } = await supabase
          .from('team_members')
          .insert([{
            id: memberId,
            team_id: teamId,
            user_id: vjId,
            role_in_team: 'VJ'
          }]);
        if (linkInsertError) throw linkInsertError;
      }

      // 1.4 Delete old scores for this VJ in the date range [startDate, endDate]
      const { error: scoreDeleteError } = await supabase
        .from('scores')
        .delete()
        .eq('vj_id', vjId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (scoreDeleteError) throw scoreDeleteError;

      // 1.5 Insert new consolidated scores on the endDate
      const scoreInserts = [];
      let totalVjScore = 0;

      if (confirmed > 0) {
        scoreInserts.push({
          id: crypto.randomUUID(),
          date: endDate,
          vj_id: vjId,
          mc_id: activeAdminId,
          team_id: teamId,
          score: Math.round(confirmed),
          status: 'confirmed',
          submitted_at: new Date().toISOString()
        });
        totalVjScore += confirmed;
      }

      if (pending > 0) {
        scoreInserts.push({
          id: crypto.randomUUID(),
          date: endDate,
          vj_id: vjId,
          mc_id: activeAdminId,
          team_id: teamId,
          score: Math.round(pending),
          status: 'pending',
          submitted_at: new Date().toISOString()
        });
        totalVjScore += pending;
      }

      if (disputed > 0) {
        scoreInserts.push({
          id: crypto.randomUUID(),
          date: endDate,
          vj_id: vjId,
          mc_id: activeAdminId,
          team_id: teamId,
          score: Math.round(disputed),
          status: 'disputed',
          submitted_at: new Date().toISOString()
        });
        totalVjScore += disputed;
      }

      if (scoreInserts.length > 0) {
        const { error: scoresInsertError } = await supabase
          .from('scores')
          .insert(scoreInserts);
        if (scoresInsertError) throw scoresInsertError;
      }

      // Track total score for the team on the endDate
      teamTotalScores[teamId] = (teamTotalScores[teamId] || 0) + totalVjScore;
    }

    // 2. Insert or update consolidated Daily Summaries for each team to balance cross-check
    for (const [teamId, total] of Object.entries(teamTotalScores)) {
      // Delete existing daily summaries for this team in the date range [startDate, endDate]
      const { error: summaryDeleteError } = await supabase
        .from('daily_summaries')
        .delete()
        .eq('team_id', teamId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (summaryDeleteError) throw summaryDeleteError;

      // Insert new summary on the endDate
      const { error: summaryInsertError } = await supabase
        .from('daily_summaries')
        .insert([{
          id: crypto.randomUUID(),
          date: endDate,
          team_id: teamId,
          tiktok_total: Math.round(total),
          mc_id: activeAdminId
        }]);

      if (summaryInsertError) throw summaryInsertError;
    }

    // 3. Log action
    await logActionSupabase(
      activeAdminId,
      'IMPORT_REPORT',
      `Imported billing cycle report for ${startDate} to ${endDate}. Created ${newUsersCount} VJs.`
    );

    return NextResponse.json({ success: true, newUsersCount });
  } catch (error: any) {
    console.error('Error importing report:', error);
    return NextResponse.json({ error: error.message || 'Failed to import report' }, { status: 500 });
  }
}
