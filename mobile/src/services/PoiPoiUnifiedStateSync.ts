import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  mergePoiPoiState,
  deserializePoiPoiState,
  serializePoiPoiState,
  type PoiPoiUnifiedState,
  type PoiPoiStateRecord,
} from './PoiPoiUnifiedState';

const STORAGE_KEY = 'poipoi:unified-ai-state:v1';

const emptyState = (): PoiPoiUnifiedState => ({
  version: 1,
  records: [],
});

let queue: Promise<unknown> = Promise.resolve();

function locked<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation);
  queue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

async function readLocal(): Promise<PoiPoiUnifiedState> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  return json ? deserializePoiPoiState(json) : emptyState();
}

async function saveLocal(state: PoiPoiUnifiedState): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    serializePoiPoiState(state)
  );
}

export function getMobilePoiPoiState(): Promise<PoiPoiUnifiedState> {
  return locked(readLocal);
}

export function updateMobilePoiPoiState(
  record: PoiPoiStateRecord
): Promise<PoiPoiUnifiedState> {
  return locked(async () => {
    const current = await readLocal();
    const merged = mergePoiPoiState(current, {
      version: 1,
      records: [record],
    });
    await saveLocal(merged);
    return merged;
  });
}

export function synchronizeMobilePoiPoiState(
  serverUrl: string,
  headers: Record<string, string> = {}
): Promise<PoiPoiUnifiedState> {
  return locked(async () => {
    const local = await readLocal();
    const base = serverUrl.replace(/\/+$/, '');
    const response = await fetch(
      `${base}/api/trpc/poipoiUnifiedState.sync`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(local),
      }
    );

    if (!response.ok) {
      throw new Error(`PoiPoi state sync failed: ${response.status}`);
    }

    const payload: unknown = await response.json();

    if (
      !payload ||
      typeof payload !== 'object' ||
      !('result' in payload)
    ) {
      throw new Error('Invalid PoiPoi sync response');
    }

    const responseBody = payload as {
      error?: { message?: string };
      result?: { data?: unknown };
    };

    if (responseBody.error) {
      throw new Error(
        responseBody.error.message || 'PoiPoi state sync rejected'
      );
    }

    const result = responseBody.result?.data;

    const remoteData =
      result &&
      typeof result === 'object' &&
      'json' in result
        ? result.json
        : result;

    const remote = deserializePoiPoiState(
      JSON.stringify(remoteData)
    );

    const merged = mergePoiPoiState(local, remote);
    await saveLocal(merged);

    if (serializePoiPoiState(merged) !== serializePoiPoiState(remote)) {
      const confirmation = await fetch(
        `${base}/api/trpc/poipoiUnifiedState.sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify(merged),
        }
      );

      if (!confirmation.ok) {
        throw new Error(
          `PoiPoi state confirmation failed: ${confirmation.status}`
        );
      }
    }

    return merged;
  });
}