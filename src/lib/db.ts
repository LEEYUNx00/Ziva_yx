import Database from 'better-sqlite3';
import path from 'path';

// Connect to SQLite DB
const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

// Enable Foreign Keys
db.pragma('foreign_keys = ON');

export function initDb() {
  console.log('Initializing database...');
  
  // 1. Users Table (Admin, MC, VJ)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'MC', 'VJ')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Teams Table (e.g. ZIVA-009(เช้า))
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      shift TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Team Members Table (Mapping Users to Teams)
  db.exec(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role_in_team TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(team_id, user_id)
    )
  `);

  // 4. Daily Scores Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL, -- YYYY-MM-DD
      vj_id TEXT NOT NULL,
      mc_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      confirmed_at DATETIME,
      FOREIGN KEY(vj_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(mc_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE
    )
  `);

  // 5. Daily Summaries (For TikTok Total Cross-check)
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_summaries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      team_id TEXT NOT NULL,
      tiktok_total INTEGER NOT NULL,
      mc_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY(mc_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 6. Audit Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(admin_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 7. Settings Table (for Date Range)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  console.log('Database initialized successfully.');
}

// Helper to log audit actions
export function logAction(adminId: string, action: string, details: string) {
  try {
    const stmt = db.prepare('INSERT INTO audit_logs (id, admin_id, action, details) VALUES (?, ?, ?, ?)');
    stmt.run(crypto.randomUUID(), adminId, action, details);
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

// Optional: seed some default data if empty
export function seedDb() {
  const adminCount = db.prepare('SELECT count(*) as count FROM users WHERE role = ?').get('ADMIN') as { count: number };
  if (adminCount.count === 0) {
    console.log('Seeding initial admin user...');
    const stmt = db.prepare('INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)');
    stmt.run('admin-1', 'admin', 'admin123', 'Super Admin', 'ADMIN');
    
    // Seed mockup teams
    const teamStmt = db.prepare('INSERT INTO teams (id, name, shift) VALUES (?, ?, ?)');
    teamStmt.run('team-1', 'ZIVA-096', 'ดึก');
    teamStmt.run('team-2', 'ZIVA-009', 'เช้า');
    teamStmt.run('team-3', 'ZIVA-066', 'เช้า');
    teamStmt.run('team-4', 'ZIVA-069', 'ดึก');

    // Seed mockup MC and VJs
    stmt.run('mc-1', 'mc1', 'mc123', 'MC Dee', 'MC');
    stmt.run('mc-2', 'mc2', 'mc123', 'MC Bobby', 'MC');
    stmt.run('vj-1', 'vj1', 'vj123', 'Onyx', 'VJ');
    stmt.run('vj-2', 'vj2', 'vj123', 'Sunji', 'VJ');
    stmt.run('vj-3', 'vj3', 'vj123', 'Fristone', 'VJ');
    stmt.run('vj-4', 'vj4', 'vj123', 'Taeyong', 'VJ');
    stmt.run('vj-5', 'vj5', 'vj123', 'Tee', 'VJ');
    stmt.run('vj-6', 'vj6', 'vj123', 'Kimjin', 'VJ');
    stmt.run('vj-7', 'vj7', 'vj123', 'pond', 'VJ');
    stmt.run('vj-8', 'vj8', 'vj123', 'SPY', 'VJ');

    // Map to team-1 (ZIVA-096)
    const memberStmt = db.prepare('INSERT OR IGNORE INTO team_members (id, team_id, user_id) VALUES (?, ?, ?)');
    memberStmt.run('tm-1', 'team-1', 'mc-1');
    memberStmt.run('tm-2', 'team-1', 'vj-1');
    memberStmt.run('tm-3', 'team-1', 'vj-2');
    memberStmt.run('tm-4', 'team-1', 'vj-3');
    memberStmt.run('tm-5', 'team-1', 'vj-4');
    memberStmt.run('tm-6', 'team-1', 'vj-5');
    memberStmt.run('tm-7', 'team-1', 'vj-6');
    memberStmt.run('tm-8', 'team-1', 'vj-7');
    memberStmt.run('tm-9', 'team-1', 'vj-8');

    // Map to team-2 (ZIVA-009)
    memberStmt.run('tm-10', 'team-2', 'mc-2');
    memberStmt.run('tm-11', 'team-2', 'vj-1');
    memberStmt.run('tm-12', 'team-2', 'vj-2');
  }

  // Seed default settings
  const settingsCount = db.prepare('SELECT count(*) as count FROM settings').get() as { count: number };
  if (settingsCount.count === 0) {
    console.log('Seeding initial settings...');
    const settingsStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    settingsStmt.run('vj_date_range_start', '2026-06-01');
    settingsStmt.run('vj_date_range_end', '2026-06-30');
  }
}

export default db;
