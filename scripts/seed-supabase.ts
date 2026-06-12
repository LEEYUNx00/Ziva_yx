import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env variables NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log('Seeding Supabase data...');

  // 1. Seed Users
  const { data: existingUsers, error: userFetchError } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (userFetchError) {
    console.error('Error checking users, make sure you ran the SQL script in Supabase first:', userFetchError);
    return;
  }

  if (existingUsers.length === 0) {
    console.log('No users found. Inserting seed users...');
    
    const users = [
      { id: 'admin-1', username: 'admin', password: 'admin123', name: 'Super Admin', role: 'ADMIN' },
      { id: 'mc-1', username: 'mc1', password: 'mc123', name: 'MC Dee', role: 'MC' },
      { id: 'mc-2', username: 'mc2', password: 'mc123', name: 'MC Bobby', role: 'MC' },
      { id: 'vj-1', username: 'vj1', password: 'vj123', name: 'Onyx', role: 'VJ' },
      { id: 'vj-2', username: 'vj2', password: 'vj123', name: 'Sunji', role: 'VJ' },
      { id: 'vj-3', username: 'vj3', password: 'vj123', name: 'Fristone', role: 'VJ' },
      { id: 'vj-4', username: 'vj4', password: 'vj123', name: 'Taeyong', role: 'VJ' },
      { id: 'vj-5', username: 'vj5', password: 'vj123', name: 'Tee', role: 'VJ' },
      { id: 'vj-6', username: 'vj6', password: 'vj123', name: 'Kimjin', role: 'VJ' },
      { id: 'vj-7', username: 'vj7', password: 'vj123', name: 'pond', role: 'VJ' },
      { id: 'vj-8', username: 'vj8', password: 'vj123', name: 'SPY', role: 'VJ' }
    ];

    const { error: userInsertError } = await supabase.from('users').insert(users);
    if (userInsertError) console.error('Error seeding users:', userInsertError);
    else console.log('Users seeded.');
  }

  // 2. Seed Teams
  const { data: existingTeams } = await supabase.from('teams').select('id').limit(1);
  if (existingTeams && existingTeams.length === 0) {
    console.log('No teams found. Inserting seed teams...');
    const teams = [
      { id: 'team-1', name: 'ZIVA-096', shift: 'ดึก' },
      { id: 'team-2', name: 'ZIVA-009', shift: 'เช้า' },
      { id: 'team-3', name: 'ZIVA-066', shift: 'เช้า' },
      { id: 'team-4', name: 'ZIVA-069', shift: 'ดึก' }
    ];

    const { error: teamInsertError } = await supabase.from('teams').insert(teams);
    if (teamInsertError) console.error('Error seeding teams:', teamInsertError);
    else console.log('Teams seeded.');
  }

  // 3. Seed Team Members
  const { data: existingMembers } = await supabase.from('team_members').select('id').limit(1);
  if (existingMembers && existingMembers.length === 0) {
    console.log('No team members found. Inserting seed team members...');
    const members = [
      { id: 'tm-1', team_id: 'team-1', user_id: 'mc-1' },
      { id: 'tm-2', team_id: 'team-1', user_id: 'vj-1' },
      { id: 'tm-3', team_id: 'team-1', user_id: 'vj-2' },
      { id: 'tm-4', team_id: 'team-1', user_id: 'vj-3' },
      { id: 'tm-5', team_id: 'team-1', user_id: 'vj-4' },
      { id: 'tm-6', team_id: 'team-1', user_id: 'vj-5' },
      { id: 'tm-7', team_id: 'team-1', user_id: 'vj-6' },
      { id: 'tm-8', team_id: 'team-1', user_id: 'vj-7' },
      { id: 'tm-9', team_id: 'team-1', user_id: 'vj-8' },
      { id: 'tm-10', team_id: 'team-2', user_id: 'mc-2' },
      { id: 'tm-11', team_id: 'team-2', user_id: 'vj-1' },
      { id: 'tm-12', team_id: 'team-2', user_id: 'vj-2' }
    ];

    const { error: memberInsertError } = await supabase.from('team_members').insert(members);
    if (memberInsertError) console.error('Error seeding team members:', memberInsertError);
    else console.log('Team members seeded.');
  }

  // 4. Seed Settings
  const { data: existingSettings } = await supabase.from('settings').select('key').limit(1);
  if (existingSettings && existingSettings.length === 0) {
    console.log('No settings found. Inserting seed settings...');
    const settings = [
      { key: 'vj_date_range_start', value: '2026-06-01' },
      { key: 'vj_date_range_end', value: '2026-06-30' }
    ];

    const { error: settingsInsertError } = await supabase.from('settings').insert(settings);
    if (settingsInsertError) console.error('Error seeding settings:', settingsInsertError);
    else console.log('Settings seeded.');
  }

  console.log('Supabase seeding sequence finished.');
}

seed();
