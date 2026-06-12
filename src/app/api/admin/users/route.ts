import { NextResponse } from 'next/server';
import { supabase, logActionSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id, 
        username, 
        name, 
        role, 
        created_at,
        team_members (
          team_id,
          teams (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedUsers = (users || []).map((u: any) => {
      const firstMember = u.team_members && u.team_members[0];
      return {
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        created_at: u.created_at,
        teamId: firstMember?.team_id || null,
        teamName: firstMember?.teams?.name || null
      };
    });

    return NextResponse.json(formattedUsers);
  } catch (error: any) {
    console.error('Error fetching users from Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, name, role, teamId, adminId } = body;

    if (!username || !password || !name || !role || !adminId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = crypto.randomUUID();
    
    // 1. Create user
    const { error: userError } = await supabase
      .from('users')
      .insert([{
        id: userId,
        username: username.trim(),
        password,
        name: name.trim(),
        role
      }]);

    if (userError) throw userError;

    // 2. Assign team if provided
    if (teamId && role !== 'ADMIN') {
      const memberId = 'tm-' + crypto.randomUUID().substring(0, 8);
      const { error: teamError } = await supabase
        .from('team_members')
        .insert([{
          id: memberId,
          team_id: teamId,
          user_id: userId,
          role_in_team: role
        }]);
      if (teamError) throw teamError;
    }

    await logActionSupabase(adminId, 'CREATE_USER', `Created user ${name} (${username}) as ${role} in team ${teamId || 'None'}`);

    return NextResponse.json({ success: true, user: { id: userId, username, name, role } });
  } catch (error: any) {
    console.error('Error creating user on Supabase:', error);
    if (error.message && error.message.includes('unique_username')) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, username, password, name, role, teamId, adminId } = body;

    if (!id || !username || !name || !role || !adminId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Update user
    const updateData: any = {
      username: username.trim(),
      name: name.trim(),
      role
    };

    if (password && password.trim() !== '') {
      updateData.password = password;
    }

    const { error: userError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id);

    if (userError) throw userError;

    // 2. Update team membership
    // Delete existing team mappings
    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('user_id', id);

    if (deleteError) throw deleteError;

    // Insert new team mapping if teamId is provided and role is not ADMIN
    if (teamId && role !== 'ADMIN') {
      const memberId = 'tm-' + crypto.randomUUID().substring(0, 8);
      const { error: teamError } = await supabase
        .from('team_members')
        .insert([{
          id: memberId,
          team_id: teamId,
          user_id: id,
          role_in_team: role
        }]);
      if (teamError) throw teamError;
    }

    await logActionSupabase(adminId, 'UPDATE_USER', `Updated user ${name} (${username}) role to ${role}, team to ${teamId || 'None'}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user on Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const adminId = searchParams.get('adminId');

    if (!id || !adminId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user details first for logging
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('name, username')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // 1. Delete team members mapping
    const { error: tmDeleteErr } = await supabase
      .from('team_members')
      .delete()
      .eq('user_id', id);
    if (tmDeleteErr) console.error('Error deleting team members mappings:', tmDeleteErr);

    // 2. Delete scores associated with this user (either as VJ or MC)
    const { error: scoreDeleteErr } = await supabase
      .from('scores')
      .delete()
      .or(`vj_id.eq.${id},mc_id.eq.${id}`);
    if (scoreDeleteErr) console.error('Error deleting scores:', scoreDeleteErr);

    // 3. Delete daily summaries associated with this MC
    const { error: dsDeleteErr } = await supabase
      .from('daily_summaries')
      .delete()
      .eq('mc_id', id);
    if (dsDeleteErr) console.error('Error deleting daily summaries:', dsDeleteErr);

    // 4. Delete audit logs associated with this admin
    const { error: alDeleteErr } = await supabase
      .from('audit_logs')
      .delete()
      .eq('admin_id', id);
    if (alDeleteErr) console.error('Error deleting audit logs:', alDeleteErr);

    // 5. Finally delete user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    if (user) {
      await logActionSupabase(adminId, 'DELETE_USER', `Deleted user ${user.name} (${user.username})`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user on Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
  }
}
