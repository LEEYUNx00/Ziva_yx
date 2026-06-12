import { NextResponse } from 'next/server';
import { supabase, logActionSupabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { teamId, userId, roleInTeam, adminId } = body;

    if (!teamId || !userId || !adminId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if member already exists
    const { data: existing, error: checkError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existing) {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 400 });
    }

    const memberId = 'tm-' + crypto.randomUUID().substring(0, 8);
    const { error: insertError } = await supabase
      .from('team_members')
      .insert([{
        id: memberId,
        team_id: teamId,
        user_id: userId,
        role_in_team: roleInTeam || null
      }]);

    if (insertError) throw insertError;

    // Fetch details for logging
    const { data: team } = await supabase.from('teams').select('name').eq('id', teamId).single();
    const { data: user } = await supabase.from('users').select('name, role').eq('id', userId).single();

    if (team && user) {
      await logActionSupabase(
        adminId,
        'ASSIGN_MEMBER',
        `Assigned user "${user.name}" (${user.role}) to team "${team.name}"`
      );
    }

    return NextResponse.json({ success: true, memberId });
  } catch (error: any) {
    console.error('Error assigning member on Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to assign member' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');
    const userId = searchParams.get('userId');
    const adminId = searchParams.get('adminId');

    if (!teamId || !userId || !adminId) {
      return NextResponse.json({ error: 'Missing teamId, userId or adminId' }, { status: 400 });
    }

    // Fetch details for logging
    const { data: team } = await supabase.from('teams').select('name').eq('id', teamId).single();
    const { data: user } = await supabase.from('users').select('name, role').eq('id', userId).single();

    if (!team || !user) {
      return NextResponse.json({ error: 'Team or User not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    await logActionSupabase(
      adminId,
      'REMOVE_MEMBER',
      `Removed user "${user.name}" (${user.role}) from team "${team.name}"`
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing member from Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove member' }, { status: 500 });
  }
}
