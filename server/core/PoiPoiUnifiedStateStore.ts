import { promises as fs } from 'node:fs';
import path from 'node:path';
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

  const temporary = `${stateFile}.${process.pid}.tmp`;

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