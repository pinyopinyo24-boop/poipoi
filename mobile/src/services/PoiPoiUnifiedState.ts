export type PoiPoiStateCategory =
  | 'memory'
  | 'learning'
  | 'evolution';

export interface PoiPoiStateRecord {
  id: string;
  category: PoiPoiStateCategory;
  value: string;
  updatedAt: number;
  origin: 'pc' | 'android';
}

export interface PoiPoiUnifiedState {
  version: 1;
  records: PoiPoiStateRecord[];
}

export function mergePoiPoiState(
  local: PoiPoiUnifiedState,
  remote: PoiPoiUnifiedState
): PoiPoiUnifiedState {
  const merged = new Map<string, PoiPoiStateRecord>();

  for (const record of [...local.records, ...remote.records]) {
    const key = `${record.category}:${record.id}`;
    const previous = merged.get(key);

    if (
      !previous ||
      record.updatedAt > previous.updatedAt ||
      (record.updatedAt === previous.updatedAt &&
        record.origin === 'pc' &&
        previous.origin !== 'pc')
    ) {
      merged.set(key, record);
    }
  }

  return {
    version: 1,
    records: Array.from(merged.values()).sort(
      (a, b) => a.updatedAt - b.updatedAt
    ),
  };
}

export function serializePoiPoiState(
  state: PoiPoiUnifiedState
): string {
  return JSON.stringify(state);
}

export function deserializePoiPoiState(
  json: string
): PoiPoiUnifiedState {
  const parsed: unknown = JSON.parse(json);

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('version' in parsed) ||
    parsed.version !== 1 ||
    !('records' in parsed) ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error('Invalid PoiPoi unified state');
  }

  const records: PoiPoiStateRecord[] = [];

  if (parsed.records.length > 10000) throw new Error('PoiPoi state exceeds sync limit');

  for (const item of parsed.records) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.id !== 'string' ||
      !['memory', 'learning', 'evolution'].includes(item.category) ||
      typeof item.value !== 'string' ||
      typeof item.updatedAt !== 'number' ||
      !Number.isFinite(item.updatedAt) ||
      !['pc', 'android'].includes(item.origin)
    ) {
      throw new Error('Invalid PoiPoi state record');
    }

    records.push({
      id: item.id,
      category: item.category,
      value: item.value,
      updatedAt: item.updatedAt,
      origin: item.origin,
    });
  }

  return { version: 1, records };
}