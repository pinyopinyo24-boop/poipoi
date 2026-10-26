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