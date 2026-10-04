import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type PublicEnvironment = {
  BASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
};
const environment = (import.meta as ImportMeta & { env: PublicEnvironment }).env;
let client: SupabaseClient | undefined;

export class SupabaseApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function isSupabaseConfigured() {
  return Boolean(
    environment?.VITE_SUPABASE_URL &&
    (environment.VITE_SUPABASE_ANON_KEY || environment.VITE_SUPABASE_PUBLISHABLE_KEY),
  );
}

function getClient() {
  if (client) return client;
  if (!isSupabaseConfigured()) throw new SupabaseApiError('إعداد اتصال المتجر غير مكتمل.', 503);
  const url = environment.VITE_SUPABASE_URL!;
  const key = environment.VITE_SUPABASE_ANON_KEY || environment.VITE_SUPABASE_PUBLISHABLE_KEY!;
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsed.hostname))
    throw new SupabaseApiError('اتصال المتجر يحتاج عنوان HTTPS.', 503);
  let privilegedKey = key.startsWith('sb_secret_');
  try {
    const segment = key.split('.')[1];
    if (segment)
      privilegedKey ||=
        JSON.parse(atob(segment.replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role';
  } catch {
    /* Publishable keys need not be JWTs. */
  }
  if (privilegedKey) throw new SupabaseApiError('استخدم مفتاح المتجر العام في إعداد الواجهة.', 503);
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

function fail(error: { message?: string; status?: number; code?: string }): never {
  const message = error.message || 'تعذّر إتمام الطلب. حاول مرة أخرى.';
  const prefix = message.match(/^\s*(400|401|403|404|409|422|429|503)\s*[:|]\s*(.*)$/s);
  const authMessage = /سج.?ل الدخول|تسجيل الدخول|not authenticated|authentication required/i.test(
    message,
  );
  const roleMessage =
    /غير مصرح|غير مسموح|صلاحيات|للمالك فقط|permission denied|admin required/i.test(message);
  const status =
    error.status ||
    (prefix
      ? Number(prefix[1])
      : error.code === '28000' || error.code === 'PGRST301' || authMessage
        ? 401
        : error.code === '42501' || roleMessage
          ? 403
          : error.code === '23505'
            ? 409
            : 400);
  throw new SupabaseApiError(prefix ? prefix[2] : message, status);
}

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await getClient().rpc(name, args);
  if (error) fail(error);
  return normalizeMedia(data) as T;
}

function normalizeMedia(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeMedia);
  if (!value || typeof value !== 'object') return value;
  const base = environment.BASE_URL || '/Dar-ElBon-/';
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      ['image', 'heroImage', 'heroVideo'].includes(key) &&
      typeof item === 'string' &&
      /^\/(images|media)\//.test(item)
        ? `${base.endsWith('/') ? base : base + '/'}${item.slice(1)}`
        : normalizeMedia(item),
    ]),
  );
}

function canonicalMedia(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalMedia);
  if (!value || typeof value !== 'object') return value;
  const base = environment.BASE_URL || '/Dar-ElBon-/';
  const prefix = base.endsWith('/') ? base : base + '/';
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      const media = ['image', 'heroImage', 'heroVideo'].includes(key) && typeof item === 'string';
      const relative = media && item.startsWith(prefix) ? item.slice(prefix.length) : '';
      return [
        key,
        media && /^(images|media)\//.test(relative) ? `/${relative}` : canonicalMedia(item),
      ];
    }),
  );
}

async function currentProfile<T>() {
  const { data, error } = await getClient().auth.getSession();
  if (error) fail(error);
  if (!data.session) throw new SupabaseApiError('سجّل الدخول للإدارة أولًا.', 401);
  const profile = await rpc<Record<string, unknown>>('dar_admin', { action: 'me', payload: {} });
  if (!profile || !['owner', 'manager'].includes(String(profile.role)))
    throw new SupabaseApiError('الحساب غير مصرح له بدخول إدارة المتجر.', 403);
  return {
    ...profile,
    id: profile.id || data.session.user.id,
    username: profile.username || profile.email || data.session.user.email || '',
  } as T;
}

async function uploadImage(body: FormData) {
  const file = body.get('image');
  if (!(file instanceof File) || !file.size || file.size > 8 * 1024 * 1024)
    throw new SupabaseApiError('اختر صورة صالحة حتى ٨ ميجابايت.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new SupabaseApiError('استخدم صورة JPG أو PNG أو WebP.');
  await currentProfile();
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const signature =
    file.type === 'image/jpeg'
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : file.type === 'image/png'
        ? [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
        : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
          String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!signature) throw new SupabaseApiError('محتوى الملف لا يطابق نوع الصورة.');
  let decoded: ImageBitmap;
  try {
    decoded = await createImageBitmap(file);
  } catch {
    throw new SupabaseApiError('الصورة غير صالحة. اختر ملفًا آخر.');
  }
  try {
    if (!decoded.width || !decoded.height || decoded.width * decoded.height > 24000000)
      throw new SupabaseApiError('الصورة أكبر من الحد المدعوم: ٢٤ مليون بكسل.');
    const ratio = Math.min(1, 1800 / Math.max(decoded.width, decoded.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(decoded.width * ratio));
    canvas.height = Math.max(1, Math.round(decoded.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new SupabaseApiError('تعذّر تجهيز الصورة في هذا المتصفح.');
    context.drawImage(decoded, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.85),
    );
    if (!blob || blob.size > 8 * 1024 * 1024)
      throw new SupabaseApiError('تعذّر تجهيز الصورة للرفع.');
    const { data: user, error: authError } = await getClient().auth.getUser();
    if (authError) fail(authError);
    if (!user.user) throw new SupabaseApiError('سجّل الدخول للإدارة أولًا.', 401);
    const extension = blob.type === 'image/webp' ? 'webp' : 'png';
    const path = `${user.user.id}/${crypto.randomUUID()}.${extension}`;
    const storage = getClient().storage.from('coffee-media');
    const { error } = await storage.upload(path, blob, { contentType: blob.type, upsert: false });
    if (error) fail(error);
    return { url: storage.getPublicUrl(path).data.publicUrl };
  } finally {
    decoded.close();
  }
}

export async function supabaseApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const request = new URL(url, 'https://store.invalid');
  const path = request.pathname;
  const method = (options.method || 'GET').toUpperCase();
  const body =
    typeof options.body === 'string' ? (JSON.parse(options.body) as Record<string, unknown>) : {};
  if (path === '/auth/login' && method === 'POST') {
    const email = String(body.email || body.username || '').trim();
    const { error } = await getClient().auth.signInWithPassword({
      email,
      password: String(body.password || ''),
    });
    if (error)
      throw new SupabaseApiError(
        'البريد الإلكتروني أو كلمة المرور غير صحيحين.',
        error.status || 401,
      );
    try {
      return { ok: true, user: await currentProfile() } as T;
    } catch (error) {
      await getClient().auth.signOut();
      throw error;
    }
  }
  if (path === '/auth/me' && method === 'GET') return currentProfile<T>();
  if (path === '/auth/logout' && method === 'POST') {
    const { error } = await getClient().auth.signOut();
    if (error) fail(error);
    return { ok: true } as T;
  }
  if (path === '/auth/password' && method === 'POST') {
    await currentProfile();
    const password = String(body.password || '');
    if (password.length < 12 || password.length > 128)
      throw new SupabaseApiError('كلمة المرور الجديدة من ١٢ إلى ١٢٨ حرفًا.');
    const { data, error } = await getClient().auth.getUser();
    if (error) fail(error);
    if (!data.user?.email) throw new SupabaseApiError('تعذّر التحقق من حساب الإدارة.', 401);
    const verified = await getClient().auth.signInWithPassword({
      email: data.user.email,
      password: String(body.currentPassword || ''),
    });
    if (verified.error) throw new SupabaseApiError('كلمة المرور الحالية غير صحيحة.', 401);
    const updated = await getClient().auth.updateUser({ password });
    if (updated.error) fail(updated.error);
    return { ok: true } as T;
  }
  if (path === '/store' && method === 'GET') return rpc<T>('dar_store');
  if (path === '/orders' && method === 'POST') return rpc<T>('dar_place_order', { input: body });
  const order = path.match(/^\/orders\/([^/]+)$/);
  if (order && method === 'GET')
    return rpc<T>('dar_track_order', { token: decodeURIComponent(order[1]) });
  if (['/admin/upload', '/admin/uploads'].includes(path) && method === 'POST') {
    if (!(options.body instanceof FormData)) throw new SupabaseApiError('اختر صورة للرفع.');
    return (await uploadImage(options.body)) as T;
  }
  if (path.startsWith('/admin/')) {
    await currentProfile();
    return rpc<T>('dar_admin', {
      action: `${method} ${path}`,
      payload: {
        ...(canonicalMedia(body) as Record<string, unknown>),
        _query: Object.fromEntries(request.searchParams),
      },
    });
  }
  throw new SupabaseApiError('المسار غير موجود.', 404);
}

export function listenForStoreChanges(callback: () => void): () => void {
  if (!isSupabaseConfigured()) return () => {};
  const connection = getClient();
  const channel = connection
    .channel(`store-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dar_products' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dar_settings' }, callback)
    .subscribe();
  return () => {
    void connection.removeChannel(channel);
  };
}
