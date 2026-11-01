import 'dotenv/config';
import { DatabaseSync, backup } from 'node:sqlite';
import { existsSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

// Local operator CLI only. This is deliberately not exposed as an HTTP endpoint.
async function main() {
  if (process.env.DATABASE_URL?.trim()) throw new Error('This helper is for the PC local account database. A configured external database was not changed.');
  const filename = path.resolve(process.cwd(), 'data', 'auth', 'accounts.sqlite');
  if (!existsSync(filename)) throw new Error('The PC account database was not found. No empty database was created.');
  const db = new DatabaseSync(filename, { timeout: 5000 });
  try {
    const accounts = db.prepare('SELECT id, openId, name, email, role FROM users ORDER BY id').all();
    if (!accounts.length) throw new Error('No registered accounts were found.');
    console.table(accounts.map(account => ({ ID: account.id, Name: account.name, Email: account.email, Role: account.role })));
    let selected = accounts.length === 1 ? Number(accounts[0].id) : 0;
    if (!selected) {
      const reader = createInterface({ input: process.stdin, output: process.stdout });
      try {
        const answer = (await reader.question('Enter YOUR account ID from the list (blank cancels): ')).trim();
        if (!/^[1-9]\d*$/.test(answer)) throw new Error('Cancelled. No account roles were changed.');
        selected = Number(answer);
      } finally { reader.close(); }
    }
    const account = accounts.find(item => Number(item.id) === selected);
    if (!account) throw new Error('The selected account does not exist. No roles were changed.');
    if (account.role === 'admin') { console.log(`Account ${selected} already has the admin role. No change was needed.`); return; }
    const backupPath = path.join(path.dirname(filename), `accounts.before-owner-${Date.now()}-${randomUUID()}.sqlite`);
    await backup(db, backupPath);
    chmodSync(backupPath, 0o600);
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = db.prepare("UPDATE users SET role = 'admin', updatedAt = ? WHERE id = ? AND openId = ?")
        .run(new Date().toISOString(), selected, String(account.openId));
      if (Number(result.changes) !== 1) throw new Error('The selected account changed during setup.');
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    const saved = db.prepare('SELECT role FROM users WHERE id = ?').get(selected);
    if (saved?.role !== 'admin') throw new Error('The saved role could not be confirmed.');
    console.log(`SUCCESS: Account ${selected} is now admin. Account ID and history were preserved.`);
    console.log('Refresh the PoiPoi page with Ctrl+F5. No server restart is needed.');
    console.log('No code preview was applied. No tests or builds were run.');
  } finally { db.close(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
