import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/db.mjs';
import { createAdmin } from '../server/auth.mjs';
import { createApp } from '../server/app.mjs';
const dir = mkdtempSync(join(tmpdir(), 'dar-browser-'));
const db = openDatabase(dir);
// Synthetic credentials only for an isolated, temporary browser-test database.
await createAdmin(db, {
  username: 'browser.tester',
  name: 'مدير الاختبار',
  password: 'Browser-test-only-3948!',
});
const { app } = createApp({
  db,
  dataDir: dir,
  appOrigin: 'http://127.0.0.1:4173',
  rateLimits: false,
});
const server = app.listen(4173, '127.0.0.1');
function stop() {
  server.close(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
    process.exit(0);
  });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
