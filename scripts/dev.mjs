import { spawn } from 'node:child_process';
const api = spawn(process.execPath, ['--watch', 'server/index.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, APP_ORIGIN: process.env.APP_ORIGIN || 'http://localhost:5173' },
});
const ui = spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' });
let exiting = false;
function stop(code = 0) {
  if (exiting) return;
  exiting = true;
  api.kill();
  ui.kill();
  setTimeout(() => process.exit(code), 100);
}
api.on('exit', (code) => stop(code || 0));
ui.on('exit', (code) => stop(code || 0));
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
