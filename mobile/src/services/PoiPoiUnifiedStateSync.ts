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

    // POIPOI_SYNC_TIMEOUT_V1
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let response: Awaited<ReturnType<typeof fetch>>;

    try {
    response = await fetch(
      `${base}/api/trpc/poipoiUnifiedState.sync`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(local),
        signal: controller.signal,
      }
    );

    
    } finally {
      clearTimeout(timeout);
    }

    // POIPOI_SYNC_RESPONSE_ERROR_HANDLING_V1
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `PoiPoi state sync failed: ${response.status} ${errorText.slice(0, 300)}`
      );
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

    // POIPOI_TRPC_RESPONSE_VALIDATION_V2
    const result = responseBody.result?.data;

    if (result === undefined || result === null) {
      throw new Error('PoiPoi unified state response is empty');
    }

    const remoteData =
      result &&
      typeof result === 'object' &&
      'json' in result
        ? result.json
        : result;

    const remote = deserializePoiPoiState(
      JSON.stringify(remoteData)
    );

    // Preserve Android updates made while the network request was running.
    // The queue serializes local writes and synchronization.
    const merged = mergePoiPoiState(local, remote);
    await saveLocal(merged);

    if (merged.records.some(record =>
      !remote.records.some(existing =>
        existing.id === record.id &&
        existing.category === record.category &&
        existing.value === record.value &&
        existing.updatedAt === record.updatedAt &&
        existing.origin === record.origin
      )
    )) {
      const confirmationController = new AbortController();
      const confirmationTimeout = setTimeout(
        () => confirmationController.abort(),
        10000
      );

      let confirmation: Awaited<ReturnType<typeof fetch>>;
      try {
        confirmation = await fetch(
          `${base}/api/trpc/poipoiUnifiedState.sync`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
            body: JSON.stringify(merged),
            signal: confirmationController.signal,
          }
        );
      } finally {
        clearTimeout(confirmationTimeout);
      }

      if (!confirmation.ok) {
        const errorText = await confirmation.text().catch(() => '');
        throw new Error(
          `PoiPoi state confirmation failed: ${confirmation.status} ${errorText.slice(0, 300)}`
        );
      }
    }

    return merged;
  });
}