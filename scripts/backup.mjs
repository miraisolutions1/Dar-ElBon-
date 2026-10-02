import { backup } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { openDatabase } from '../server/db.mjs';
const db = openDatabase();
const destination = resolve(process.env.DATA_DIR || './data', 'backups');
mkdirSync(destination, { recursive: true, mode: 0o700 });
try {
  const file = resolve(destination, `dar-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
  await backup(db, file);
  console.log('Database backup saved: ' + file);
  console.log(
    'Also back up the uploads directory. Backups contain customer data and must remain private.',
  );
} finally {
  db.close();
}
