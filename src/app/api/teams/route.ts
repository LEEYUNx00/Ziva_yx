import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mcId = searchParams.get('mcId');

    let teamsQuery = supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: true });

    // If mcId is provided, fetch only teams where this MC is a member
    if (mcId) {
      // First get team ids for this MC
      const { data: memberTeams, error: memberTeamsError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', mcId);

      if (memberTeamsError) throw memberTeamsError;

      const teamIds = (memberTeams || []).map(mt => mt.team_id);
      if (teamIds.length === 0) {
        return NextResponse.json([]); // Return empty if MC has no assigned teams
      }
      teamsQuery = teamsQuery.in('id', teamIds);
    }

    const { data: teams, error: teamsError } = await teamsQuery;
    if (teamsError) throw teamsError;

    // Fetch all team members with user details
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select(`
        team_id,
        role_in_team,
        users (
          id,
          name,
          role
        )
      `);

    if (membersError) throw membersError;

    // Map members back to their respective teams
    const teamsWithMembers = (teams || []).map((team: any) => {
      const teamMembers = (members || [])
        .filter((m: any) => m.team_id === team.id)
        .map((m: any) => ({
          id: m.users?.id,
          name: m.users?.name,
          role: m.users?.role,
          role_in_team: m.role_in_team
        }));

      return {
        ...team,
        members: teamMembers
      };
    });

    return NextResponse.json(teamsWithMembers);
  } catch (error: any) {
    console.error('Error fetching teams from Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch teams' }, { status: 500 });
  }
}
