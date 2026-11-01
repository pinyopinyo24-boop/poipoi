import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';

const taskSchema = z.object({
  id: z.string().uuid(), requestId: z.string().max(512).optional(), title: z.string().min(1).max(300), createdAt: z.number(),
  dueAt: z.number().optional(), reminder: z.boolean(), completedAt: z.number().optional(), notifiedAt: z.number().optional(),
});
export type PersonalTask = z.infer<typeof taskSchema>;
const queues = new Map<string, Promise<unknown>>();
function fileFor(userId: string) {
  if (!userId || userId === 'mobile') throw new Error('タスク・リマインダーにはログインが必要です。');
  return path.resolve(process.cwd(), 'data', 'az-personal-tasks', createHash('sha256').update(userId).digest('hex') + '.json');
}
async function read(userId: string): Promise<PersonalTask[]> {
  try { return z.array(taskSchema).parse(JSON.parse(await fs.readFile(fileFor(userId), 'utf8'))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
}
async function transact<T>(userId: string, change: (tasks: PersonalTask[]) => T): Promise<T> {
  const prior = queues.get(userId) ?? Promise.resolve();
  const next = prior.catch(() => undefined).then(async () => {
    const tasks = await read(userId); const result = change(tasks);
    const file = fileFor(userId); await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = file + '.' + randomUUID() + '.tmp';
    try { await fs.writeFile(temporary, JSON.stringify(z.array(taskSchema).parse(tasks)), { mode: 0o600 }); await fs.rename(temporary, file); }
    finally { await fs.rm(temporary, { force: true }); }
    return result;
  });
  queues.set(userId, next);
  try { return await next; } finally { if (queues.get(userId) === next) queues.delete(userId); }
}
export async function listPersonalTasks(userId: string) {
  await queues.get(userId)?.catch(() => undefined);
  return (await read(userId)).sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity) || a.createdAt - b.createdAt);
}
export async function addPersonalTask(userId: string, input: { title: string; dueAt?: number; reminder?: boolean; requestId?: string }) {
  const title = input.title.trim();
  if (input.dueAt !== undefined && (!Number.isFinite(input.dueAt) || input.dueAt <= Date.now())) throw new Error('未来の日時を指定してください。');
  if (input.reminder && !input.dueAt) throw new Error('リマインダーには日時が必要です。');
  const task = taskSchema.parse({ id: randomUUID(), title, createdAt: Date.now(), requestId: input.requestId, dueAt: input.dueAt, reminder: Boolean(input.reminder) });
  return transact(userId, tasks => { const existing = input.requestId ? tasks.find(item => item.requestId === input.requestId) : undefined; if (existing) return existing; if (tasks.length >= 2000) throw new Error('保存上限です。不要なタスクを削除してください。'); tasks.push(task); return task; });
}
export async function changePersonalTask(userId: string, id: string, action: 'complete' | 'delete' | 'reopen') {
  return transact(userId, tasks => {
    const index = tasks.findIndex(task => task.id === id); if (index < 0) throw new Error('対象のタスクがありません。');
    if (action === 'delete') return tasks.splice(index, 1)[0];
    if (action === 'complete') tasks[index].completedAt = Date.now(); else delete tasks[index].completedAt;
    return tasks[index];
  });
}
export async function claimPersonalReminder(userId: string, id: string) {
  return transact(userId, tasks => {
    const task = tasks.find(item => item.id === id);
    if (!task || !task.reminder || task.completedAt || task.notifiedAt || !task.dueAt || task.dueAt > Date.now()) return { claimed: false };
    task.notifiedAt = Date.now(); return { claimed: true, title: task.title };
  });
}
