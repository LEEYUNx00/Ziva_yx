import { NextResponse } from 'next/server';
import { supabase, logActionSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, teamId, mcId } = body;

    if (!name || !name.trim() || !teamId || !mcId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const VJName = name.trim();

    // 1. Verify that the VJ name is unique (both name and username)
    // We check if name already exists
    const { data: existingByName, error: errName } = await supabase
      .from('users')
      .select('id')
      .eq('name', VJName)
      .limit(1);

    if (errName) throw errName;
    if (existingByName && existingByName.length > 0) {
      return NextResponse.json({ error: `ชื่อ VJ "${VJName}" มีอยู่ในระบบแล้ว` }, { status: 400 });
    }

    // Generate a unique username with temp prefix
    const nameClean = VJName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const tempUsername = `temp_vj_${nameClean}_${randomSuffix}`;

    // Verify tempUsername is unique (highly unlikely to collide, but good practice)
    const { data: existingByUsername, error: errUsername } = await supabase
      .from('users')
      .select('id')
      .eq('username', tempUsername)
      .limit(1);

    if (errUsername) throw errUsername;
    if (existingByUsername && existingByUsername.length > 0) {
      return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างบัญชีชั่วคราว กรุณาลองใหม่อีกครั้ง' }, { status: 400 });
    }

    // 2. Fetch team info for logging
    const { data: team, error: teamFetchErr } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

    if (teamFetchErr) throw teamFetchErr;

    // 3. Create the VJ User
    const userId = crypto.randomUUID();
    const { error: userError } = await supabase
      .from('users')
      .insert([{
        id: userId,
        username: tempUsername,
        password: 'ziva' + randomSuffix, // temporary placeholder password
        name: VJName,
        role: 'VJ'
      }]);

    if (userError) throw userError;

    // 4. Assign the VJ to the team
    const memberId = 'tm-' + crypto.randomUUID().substring(0, 8);
    const { error: teamError } = await supabase
      .from('team_members')
      .insert([{
        id: memberId,
        team_id: teamId,
        user_id: userId,
        role_in_team: 'VJ'
      }]);

    if (teamError) {
      // Rollback user creation if team assignment fails
      await supabase.from('users').delete().eq('id', userId);
      throw teamError;
    }

    // 5. Log the action
    await logActionSupabase(
      mcId, 
      'CREATE_USER', 
      `MC added new VJ ${VJName} (temp user: ${tempUsername}) to Team ${team.name}`
    );

    return NextResponse.json({ 
      success: true, 
      user: { 
        id: userId, 
        name: VJName, 
        role: 'VJ',
        username: tempUsername
      } 
    });
  } catch (error: any) {
    console.error('Error creating VJ user:', error);
    return NextResponse.json({ error: error.message || 'Failed to create VJ user' }, { status: 500 });
  }
}
