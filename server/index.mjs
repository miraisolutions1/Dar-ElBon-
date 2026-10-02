import { createApp } from './app.mjs';
if (process.env.NODE_ENV === 'production' && !process.env.APP_ORIGIN?.startsWith('https://'))
  throw new Error('APP_ORIGIN must be the public HTTPS origin in production.');
const { app, db } = createApp();
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, process.env.HOST || '0.0.0.0', () =>
  console.log(`Dar Coffee server listening on port ${port}`),
);
function stop() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
