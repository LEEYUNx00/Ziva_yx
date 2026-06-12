import { initDb, seedDb } from '../src/lib/db';

try {
  initDb();
  seedDb();
  console.log('Database setup completed.');
} catch (error) {
  console.error('Error setting up database:', error);
}
