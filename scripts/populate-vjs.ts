import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env variables NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const VJ_DATA = {
  'ZIVA-096': ['Taeyong', 'Kimjin', 'Onyx', 'Fristone', 'Sunji', 'Tee', 'pond'],
  'ZIVA-009': ['Mavis', 'Zane', 'Evans', 'dopai', 'athen', 'newton', 'willelian', 'Arthur'],
  'ZIVA-069': ['Romi', 'Gam', 'Asia Wan', 'Focus', 'Mith', 'Olive'],
  'ZIVA-066': ['Dao', 'Ant', 'Winssy', 'Pipim', 'May', 'grcece']
};

async function main() {
  console.log('Starting VJ population script...');

  // 1. Fetch or create teams
  const { data: existingTeams, error: teamsError } = await supabase.from('teams').select('*');
  if (teamsError) {
    console.error('Error fetching teams:', teamsError);
    return;
  }

  const teamMap: Record<string, string> = {}; // Name -> ID
  existingTeams.forEach(t => {
    teamMap[t.name.toUpperCase()] = t.id;
  });

  const defaultShifts: Record<string, string> = {
    'ZIVA-096': 'ดึก',
    'ZIVA-009': 'เช้า',
    'ZIVA-069': 'ดึก',
    'ZIVA-066': 'เช้า'
  };

  for (const teamName of Object.keys(VJ_DATA)) {
    const key = teamName.toUpperCase();
    if (!teamMap[key]) {
      console.log(`Team ${teamName} not found. Creating...`);
      const teamId = 'team-' + crypto.randomUUID().substring(0, 8);
      const { error: insertError } = await supabase.from('teams').insert([{
        id: teamId,
        name: teamName,
        shift: defaultShifts[teamName] || 'เช้า'
      }]);
      if (insertError) {
        console.error(`Error creating team ${teamName}:`, insertError);
        continue;
      }
      teamMap[key] = teamId;
      console.log(`Team ${teamName} created with ID ${teamId}`);
    }
  }

  // 2. Fetch existing users to avoid duplicates
  const { data: existingUsers, error: usersError } = await supabase
    .from('users')
    .select('id, username, role');
  
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  const userMap: Record<string, { id: string; role: string }> = {}; // username -> { id, role }
  existingUsers.forEach(u => {
    userMap[u.username.toLowerCase()] = { id: u.id, role: u.role };
  });

  // 3. Process each VJ
  for (const [teamName, vjs] of Object.entries(VJ_DATA)) {
    const teamId = teamMap[teamName.toUpperCase()];
    if (!teamId) continue;

    console.log(`\nProcessing VJs for team ${teamName}...`);

    for (const vjName of vjs) {
      const username = vjName.toLowerCase().replace(/\s+/g, ''); // e.g. "asiawan"
      let userId = '';

      if (userMap[username]) {
        userId = userMap[username].id;
        console.log(`VJ ${vjName} (username: ${username}) already exists with ID ${userId}.`);
      } else {
        // Create VJ user
        userId = 'vj-' + crypto.randomUUID().substring(0, 8);
        console.log(`Creating VJ ${vjName} (username: ${username})...`);
        const { error: userInsertError } = await supabase.from('users').insert([{
          id: userId,
          username,
          password: 'vj123',
          name: vjName,
          role: 'VJ'
        }]);

        if (userInsertError) {
          console.error(`Error creating VJ ${vjName}:`, userInsertError);
          continue;
        }
        userMap[username] = { id: userId, role: 'VJ' };
        console.log(`VJ ${vjName} created.`);
      }

      // Check if team member link exists
      const { data: existingLink, error: linkError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .maybeSingle();

      if (linkError) {
        console.error(`Error checking team membership for ${vjName}:`, linkError);
        continue;
      }

      if (!existingLink) {
        console.log(`Adding ${vjName} to team ${teamName}...`);
        const memberId = 'tm-' + crypto.randomUUID().substring(0, 8);
        const { error: linkInsertError } = await supabase.from('team_members').insert([{
          id: memberId,
          team_id: teamId,
          user_id: userId
        }]);

        if (linkInsertError) {
          console.error(`Error adding ${vjName} to team ${teamName}:`, linkInsertError);
        } else {
          console.log(`${vjName} successfully added to team ${teamName}.`);
        }
      } else {
        console.log(`${vjName} is already a member of team ${teamName}.`);
      }
    }
  }

  console.log('\nPopulation completed successfully!');
}

main().catch(console.error);
