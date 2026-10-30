import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  mergePoiPoiState,
  deserializePoiPoiState,
  serializePoiPoiState,
  type PoiPoiUnifiedState,
} from './PoiPoiUnifiedState';

const stateFile = path.resolve(
  process.cwd(),
  'data',
  'poipoi-unified-state.json'
);

const emptyState = (): PoiPoiUnifiedState => ({
  version: 1,
  records: [],
});

let pending: Promise<unknown> = Promise.resolve();

async function readState(): Promise<PoiPoiUnifiedState> {
  try {
    return deserializePoiPoiState(
      await fs.readFile(stateFile, 'utf8')
    );
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return emptyState();
    }
    throw error;
  }
}

async function writeState(state: PoiPoiUnifiedState): Promise<void> {
  await fs.mkdir(path.dirname(stateFile), { recursive: true });

  const temporary = `${stateFile}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;

  try {
    await fs.writeFile(
      temporary,
      serializePoiPoiState(state),
      'utf8'
    );
    await fs.rename(temporary, stateFile);
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}

export async function getPoiPoiUnifiedState(): Promise<PoiPoiUnifiedState> {
  await pending;
  return readState();
}

export function syncPoiPoiUnifiedState(
  incoming: PoiPoiUnifiedState
): Promise<PoiPoiUnifiedState> {
  const operation = pending.then(async () => {
    const current = await readState();
    const merged = mergePoiPoiState(current, incoming);
    await writeState(merged);
    return merged;
  });

  pending = operation.then(
    () => undefined,
    () => undefined
  );

  return operation;
}
const scopedQueues = new Map<string, Promise<unknown>>();

function scopedFile(userId: string): string {
  const hash = createHash('sha256').update(userId).digest('hex');
  return path.resolve(process.cwd(), 'data', 'unified-users', hash + '.json');
}

async function readScoped(file: string): Promise<PoiPoiUnifiedState> {
  try {
    return deserializePoiPoiState(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyState();
    throw error;
  }
}

export async function getUserPoiPoiUnifiedState(userId: string): Promise<PoiPoiUnifiedState> {
  const file = scopedFile(userId);
  await (scopedQueues.get(file) ?? Promise.resolve());
  return readScoped(file);
}

export async function searchUserPoiPoiMemories(
  userId: string, query: string, limit = 8
): Promise<PoiPoiUnifiedState['records']> {
  const state = await getUserPoiPoiUnifiedState(userId);
  const normalized = query.normalize('NFKC').toLocaleLowerCase().trim();
  if (!normalized) return [];
  const words = normalized.match(/[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}]+|[a-z0-9]+/gu) ?? [];
  // Japanese sentences have no spaces: include overlapping fragments for recall.
  const terms = [...new Set([
    ...words.filter(word => word.length >= 2),
    ...words.flatMap(word => word.length >= 4
      ? Array.from({ length: word.length - 1 }, (_, i) => word.slice(i, i + 2))
      : []),
  ])].slice(0, 40);
  if (!terms.length) return [];
  return state.records
    .filter(record => (record.category === 'memory' || record.category === 'learning') && !record.id.startsWith('az:'))
    .map(record => {
      const value = record.value.normalize('NFKC').toLocaleLowerCase();
      const score = terms.reduce((total, term) => total + (value.includes(term) ? term.length : 0), 0);
      return { record, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || b.record.updatedAt - a.record.updatedAt)
    .slice(0, Math.max(1, Math.min(limit, 20)))
    .map(item => item.record);
}

export function syncUserPoiPoiUnifiedState(userId: string, incoming: PoiPoiUnifiedState): Promise<PoiPoiUnifiedState> {
  const file = scopedFile(userId);
  const previous = scopedQueues.get(file) ?? Promise.resolve();
  const operation = previous.then(async () => {
    const merged = mergePoiPoiState(await readScoped(file), incoming);
    if (merged.records.length > 10000) throw new Error('PoiPoi state exceeds sync limit');
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = file + '.' + process.pid + '.' + Date.now() + '.tmp';
    try {
      await fs.writeFile(temporary, serializePoiPoiState(merged), 'utf8');
      await fs.rename(temporary, file);
    } finally {
      await fs.rm(temporary, { force: true }).catch(() => {});
    }
    return merged;
  });
  const settled = operation.then(() => undefined, () => undefined);
  scopedQueues.set(file, settled);
  void settled.then(() => { if (scopedQueues.get(file) === settled) scopedQueues.delete(file); });
  return operation;
}
