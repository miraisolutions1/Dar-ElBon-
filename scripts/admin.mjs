import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { openDatabase } from '../server/db.mjs';
import { createAdmin } from '../server/auth.mjs';
const db = openDatabase();
try {
  const username = process.env.ADMIN_USERNAME || 'admin';
  if (db.prepare('SELECT id FROM admins WHERE username=?').get(username.toLowerCase())) {
    console.log('الحساب موجود بالفعل. لم تتغير كلمة المرور.');
  } else {
    if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD)
      throw new Error('Set ADMIN_PASSWORD through your secure deployment environment.');
    if (!process.env.ADMIN_PASSWORD && existsSync('.local/admin-access.json'))
      throw new Error(
        'A private access file already exists. Preserve it and provide ADMIN_PASSWORD securely for the new account.',
      );
    const password = process.env.ADMIN_PASSWORD || randomBytes(24).toString('base64url');
    await createAdmin(db, { username, name: process.env.ADMIN_NAME || 'مدير دار البن', password });
    if (!process.env.ADMIN_PASSWORD) {
      mkdirSync('.local', { recursive: true, mode: 0o700 });
      writeFileSync(
        '.local/admin-access.json',
        JSON.stringify({ username, password }, null, 2) + '\n',
        { mode: 0o600, flag: 'wx' },
      );
      console.log(
        'تم إنشاء الحساب. بيانات الدخول في الملف المحلي الخاص: ' +
          resolve('.local/admin-access.json'),
      );
    } else console.log('تم إنشاء الحساب باستخدام كلمة المرور المزوّدة.');
  }
} finally {
  db.close();
}
