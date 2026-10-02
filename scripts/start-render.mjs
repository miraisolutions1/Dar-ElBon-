// Render sets RENDER_EXTERNAL_URL to the service's actual public HTTPS URL.
// Override APP_ORIGIN when a custom domain becomes the canonical storefront URL.
const origin = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL;
if (!origin)
  throw new Error('Set APP_ORIGIN or use a Render web service with RENDER_EXTERNAL_URL.');
const url = new URL(origin);
if (url.protocol !== 'https:' || url.origin !== origin)
  throw new Error('The public origin must be an HTTPS origin without a path or trailing slash.');
if (!process.env.DATA_DIR)
  throw new Error('Set DATA_DIR to a directory on the persistent Render disk.');
process.env.APP_ORIGIN = origin;
process.env.NODE_ENV = 'production';

// Runs at startup, when the persistent disk is mounted. Existing accounts and
// passwords are preserved; a new account requires a private ADMIN_PASSWORD.
await import('./admin.mjs');
delete process.env.ADMIN_PASSWORD;
await import('../server/index.mjs');
