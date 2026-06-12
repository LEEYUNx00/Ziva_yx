import { NextResponse } from 'next/server';
import { supabase, logActionSupabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, shift, adminId } = body;

    if (!name || !shift || !adminId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const teamId = 'team-' + crypto.randomUUID().substring(0, 8);
    const { error } = await supabase
      .from('teams')
      .insert([{
        id: teamId,
        name,
        shift
      }]);

    if (error) throw error;

    await logActionSupabase(adminId, 'CREATE_TEAM', `Created team ${name} (${shift})`);

    return NextResponse.json({ success: true, team: { id: teamId, name, shift } });
  } catch (error: any) {
    console.error('Error creating team on Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to create team' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, shift, adminId } = body;

    if (!id || !name || !shift || !adminId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch original details for logging
    const { data: original, error: fetchError } = await supabase
      .from('teams')
      .select('name, shift')
      .eq('id', id)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('teams')
      .update({ name, shift })
      .eq('id', id);

    if (updateError) throw updateError;

    await logActionSupabase(
      adminId,
      'UPDATE_TEAM',
      `Updated team ${id}: Changed name from "${original.name}" to "${name}", shift from "${original.shift}" to "${shift}"`
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating team on Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to update team' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const adminId = searchParams.get('adminId');

    if (!id || !adminId) {
      return NextResponse.json({ error: 'Missing team ID or admin ID' }, { status: 400 });
    }

    const { data: original, error: fetchError } = await supabase
      .from('teams')
      .select('name')
      .eq('id', id)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    await logActionSupabase(adminId, 'DELETE_TEAM', `Deleted team "${original.name}" (${id})`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting team from Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete team' }, { status: 500 });
  }
}
