import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export async function hashPassword(password) {
  const salt = randomBytes(24).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [salt, hex] = stored.split(':');
  const key = await scrypt(password, salt, 64);
  const expected = Buffer.from(hex, 'hex');
  return expected.length === key.length && timingSafeEqual(key, expected);
}
export async function createAdmin(db, { username, name, password, role = 'owner' }) {
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username))
    throw new Error('اسم الدخول يجب أن يكون 3–40 حرفًا إنجليزيًا أو رقمًا.');
  if (password.length < 12 || password.length > 128)
    throw new Error('كلمة المرور يجب أن تكون 12–128 حرفًا.');
  if (!['owner', 'manager'].includes(role)) throw new Error('صلاحية غير صحيحة');
  const id = randomUUID();
  db.prepare('INSERT INTO admins VALUES(?,?,?,?,?,?)').run(
    id,
    username.toLowerCase(),
    name,
    role,
    await hashPassword(password),
    Date.now(),
  );
  return id;
}
export const digest = (value) => createHash('sha256').update(value).digest('hex');
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};
export function sessionUser(db, req) {
  const token = (req.headers.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('dar_session='))
    ?.slice(12);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = db
    .prepare(
      `SELECT a.id,a.username,a.name,a.role FROM sessions s JOIN admins a ON a.id=s.admin_id WHERE s.id=? AND s.expires_at>?`,
    )
    .get(digest(token), Date.now());
  return row || null;
}
export function issueSession(db, admin, res) {
  const token = randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());
  db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(
    digest(token),
    admin.id,
    Date.now() + 12 * 60 * 60 * 1000,
  );
  res.cookie('dar_session', token, { ...cookieOptions, maxAge: 12 * 60 * 60 * 1000 });
}
