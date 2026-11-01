import { DatabaseSync } from 'node:sqlite';
import { chmodSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { InsertUser, User } from '../../drizzle/schema';

// Account storage only. Other business repositories retain their existing backends.
// Never used as a fallback for a configured but unavailable MySQL server.
const stores = new Map<string, DatabaseSync>();
function database() {
  const filename = path.resolve(process.cwd(), 'data', 'auth', 'accounts.sqlite');
  const existing = stores.get(filename);
  if (existing) return existing;
  mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  try {
    chmodSync(filename, 0o600);
    db.exec(`PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        openId TEXT NOT NULL UNIQUE,
        username TEXT UNIQUE,
        name TEXT,
        email TEXT,
        loginMethod TEXT,
        passwordHash TEXT,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        metadata TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastSignedIn TEXT NOT NULL
      );`);
    stores.set(filename, db);
    return db;
  } catch (error) { db.close(); throw error; }
}
function decode(row: Record<string, unknown> | undefined): User | undefined {
  if (!row) return undefined;
  return {
    id: Number(row.id), openId: String(row.openId),
    name: row.name === null ? null : String(row.name),
    email: row.email === null ? null : String(row.email),
    loginMethod: row.loginMethod === null ? null : String(row.loginMethod),
    passwordHash: row.passwordHash === null ? null : String(row.passwordHash),
    role: row.role === 'admin' ? 'admin' : 'user',
    metadata: row.metadata === null ? null : JSON.parse(String(row.metadata)),
    createdAt: new Date(String(row.createdAt)), updatedAt: new Date(String(row.updatedAt)),
    lastSignedIn: new Date(String(row.lastSignedIn)),
  };
}
export function getLocalUserByOpenId(openId: string) {
  return decode(database().prepare('SELECT * FROM users WHERE openId = ?').get(openId));
}
export function getLocalUserByUsername(username: string) {
  return decode(database().prepare('SELECT * FROM users WHERE username = ?').get(username));
}
export function createLocalUser(input: { username: string; passwordHash: string; name: string; email?: string | null; loginMethod?: string; role?: string }) {
  const db = database();
  const now = new Date().toISOString();
  const openId = `local_${input.username}_${Date.now()}`;
  try {
    const inserted = db.prepare(`INSERT INTO users
      (openId, username, name, email, loginMethod, passwordHash, role, createdAt, updatedAt, lastSignedIn)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(openId, input.username, input.name,
      input.email || `${input.username}@local`, input.loginMethod || 'local', input.passwordHash,
      input.role === 'admin' ? 'admin' : 'user', now, now, now);
    const user = decode(db.prepare('SELECT * FROM users WHERE id = ?').get(Number(inserted.lastInsertRowid)));
    if (!user) throw new Error('アカウントの保存結果を確認できませんでした');
    return { ...user, username: input.username };
  } catch (error) {
    // The database uniqueness constraint also protects concurrent registrations.
    if (getLocalUserByUsername(input.username)) throw new Error('このユーザー名は既に使用されています');
    throw error;
  }
}
export function upsertLocalUser(input: InsertUser) {
  const db = database();
  const now = new Date().toISOString();
  const username = input.openId.match(/^local_(.+)_(\d+)$/)?.[1] ?? null;
  // Omitted fields keep their existing values, especially during session refresh.
  const fields = ['name', 'email', 'loginMethod', 'passwordHash', 'role', 'metadata', 'lastSignedIn'] as const;
  const updates = fields.filter(field => input[field] !== undefined).map(field => `${field} = excluded.${field}`);
  updates.push('updatedAt = excluded.updatedAt');
  db.prepare(`INSERT INTO users
    (openId, username, name, email, loginMethod, passwordHash, role, metadata, createdAt, updatedAt, lastSignedIn)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(openId) DO UPDATE SET ${updates.join(', ')}`).run(
    input.openId, username, input.name ?? null, input.email ?? null, input.loginMethod ?? null,
    input.passwordHash ?? null, input.role ?? 'user', input.metadata == null ? null : JSON.stringify(input.metadata),
    input.createdAt?.toISOString() ?? now, now, input.lastSignedIn?.toISOString() ?? now);
}
export function updateLocalLastSignedIn(id: number) {
  const now = new Date().toISOString();
  database().prepare('UPDATE users SET lastSignedIn = ?, updatedAt = ? WHERE id = ?').run(now, now, id);
}
