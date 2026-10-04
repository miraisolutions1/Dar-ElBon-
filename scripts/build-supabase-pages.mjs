import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

// Only public browser configuration belongs in the published Pages bundle.
// Validate before touching docs so a missing project never replaces the preview.
const configPath = 'content/supabase-public-config.json';
const saved =
  process.env.SUPABASE_IGNORE_SAVED_CONFIG !== '1' && existsSync(configPath)
    ? JSON.parse(readFileSync(configPath, 'utf8'))
    : {};
const projectUrl = process.env.VITE_SUPABASE_URL || saved.projectUrl;
const publicKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  saved.publishableKey;
if (!projectUrl || !publicKey)
  throw new Error(
    'Set VITE_SUPABASE_URL and a public VITE_SUPABASE_ANON_KEY first. Existing docs were not changed.',
  );
let project;
try {
  project = new URL(projectUrl);
} catch {
  throw new Error('VITE_SUPABASE_URL must be an HTTPS Supabase project URL.');
}
if (
  project.protocol !== 'https:' ||
  !/^[a-z0-9-]+\.supabase\.co$/.test(project.hostname) ||
  project.username ||
  project.password ||
  project.port ||
  project.search ||
  project.hash ||
  !['', '/'].includes(project.pathname)
)
  throw new Error(
    'Use the HTTPS project URL ending in .supabase.co without credentials, paths or query parameters.',
  );
if (publicKey.startsWith('sb_secret_'))
  throw new Error(
    'Secret keys must never be included in the browser. Use an anon or publishable key.',
  );
if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publicKey)) {
  try {
    const parts = publicKey.split('.');
    if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part)))
      throw new Error();
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (payload.role !== 'anon') throw new Error();
  } catch {
    throw new Error(
      'Only an anon JWT or sb_publishable_ key is allowed. Service-role keys are forbidden.',
    );
  }
}
const root = process.cwd();
const output = resolve(root, process.env.SUPABASE_PAGES_OUT_DIR || 'docs');
const outputPath = relative(root, output);
if (outputPath !== 'docs' && !outputPath.startsWith('.local/'))
  throw new Error('Build output must be docs or a directory inside .local.');
const environment = {
  VITE_SUPABASE_URL: project.origin,
  VITE_SUPABASE_ANON_KEY: publicKey,
  DEV: false,
  PROD: true,
  MODE: 'production',
  BASE_URL: '/Dar-ElBon-/',
};
const assets = new Map();
function inlineAsset(path) {
  if (path.includes('..') || path.includes('\\')) throw new Error('Unsafe public asset path.');
  if (assets.has(path)) return assets.get(path);
  const mime = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    gif: 'image/gif',
    webp: 'image/webp',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
  }[path.split('.').pop()?.toLowerCase()];
  if (!mime) throw new Error('Unsupported public asset type: ' + path);
  const value =
    'data:' + mime + ';base64,' + readFileSync(resolve(root, 'public' + path)).toString('base64');
  assets.set(path, value);
  return value;
}
const quote = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
function inlineAssets(source) {
  return source
    .replace(
      /url\((['"]?)(\/(?:images|media)\/[^)'"\s]+)\1\)/g,
      (_, _quote, path) => `url(${inlineAsset(path)})`,
    )
    .replace(
      /\b(src|poster)=(['"])(\/(?:images|media)\/[^'"<>]+)\2/g,
      (_, attribute, _quote, path) => `${attribute}={${quote(inlineAsset(path))}}`,
    )
    .replace(/(['"])(\/(?:images|media)\/[^'"<>]+)\1/g, (_, _quote, path) =>
      quote(inlineAsset(path)),
    );
}
const result = await build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  minify: true,
  write: false,
  outdir: '.local/supabase-build',
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env': JSON.stringify(environment),
  },
  loader: { '.woff2': 'dataurl', '.woff': 'dataurl' },
  plugins: [
    {
      name: 'supabase-pages-assets',
      setup(builder) {
        builder.onLoad({ filter: /(?:src\/.*\.tsx?|content\/.*\.json)$/ }, (args) => ({
          contents: inlineAssets(readFileSync(args.path, 'utf8')),
          loader: args.path.endsWith('.json') ? 'json' : args.path.endsWith('.tsx') ? 'tsx' : 'ts',
          resolveDir: dirname(args.path),
        }));
        builder.onLoad({ filter: /src\/.*\.css$/ }, (args) => ({
          contents: inlineAssets(readFileSync(args.path, 'utf8')),
          loader: 'css',
          resolveDir: dirname(args.path),
        }));
      },
    },
  ],
});
const javascript = result.outputFiles
  .find((file) => file.path.endsWith('.js'))
  .text.replaceAll('</script', '<\\/script');
const stylesheet = result.outputFiles
  .find((file) => file.path.endsWith('.css'))
  .text.replaceAll('</style', '<\\/style');
const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>دار البن البرازيلي — الحكاية في الفنجان</title><link rel="icon" href="${inlineAsset('/images/dar-logo.webp')}"><style>${stylesheet}</style></head><body><div id="root"></div><script>${javascript}</script></body></html>`;
// Remote catalog data may reference /images or /media. Keep copies available at
// the Pages project base alongside embedded UI assets; the adapter prefixes them.
mkdirSync(output, { recursive: true });
cpSync(resolve(root, 'public'), output, { recursive: true });
writeFileSync(resolve(output, 'index.html'), html);
writeFileSync(resolve(output, '.nojekyll'), '');
console.log('Created Supabase-backed Pages bundle:', outputPath, Buffer.byteLength(html), 'bytes');
