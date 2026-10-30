import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  mergePoiPoiState,
  deserializePoiPoiState,
  serializePoiPoiState,
  type PoiPoiUnifiedState,
  type PoiPoiStateRecord,
} from './PoiPoiUnifiedState';

const STORAGE_KEY = 'poipoi:unified-ai-state:v1';

// Keep offline records separated by the active login. Legacy anonymous records
// remain on-device and are not uploaded into an unrelated authenticated account.
async function storageKey(): Promise<string> {
  const token = await AsyncStorage.getItem('sessionToken');
  if (!token) return STORAGE_KEY;
  // The signed session's openId is stable across token refreshes.
  // This is only a local storage namespace, never an authorization decision.
  try {
    const payload = token.split('.')[1];
    if (payload) {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      const encoded = payload.replace(/-/g, '+').replace(/_/g, '/');
      let bits = 0;
      let buffer = 0;
      let decoded = '';
      for (const character of encoded) {
        if (character === '=') break;
        const digit = alphabet.indexOf(character);
        if (digit < 0) throw new Error('Invalid token payload');
        buffer = (buffer << 6) | digit;
        bits += 6;
        if (bits >= 8) {
          bits -= 8;
          decoded += String.fromCharCode((buffer >>> bits) & 255);
        }
      }
      const identity: unknown = JSON.parse(decoded);
      if (identity && typeof identity === 'object' && 'openId' in identity &&
          typeof identity.openId === 'string' && identity.openId.length > 0) {
        const stableId = identity.openId;
        let stableHash = 2166136261;
        for (let i = 0; i < stableId.length; i++) {
          stableHash ^= stableId.charCodeAt(i);
          stableHash = Math.imul(stableHash, 16777619);
        }
        return STORAGE_KEY + ':user:' + (stableHash >>> 0).toString(16);
      }
    }
  } catch { /* Older opaque tokens retain their previous isolated namespace. */ }
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return STORAGE_KEY + ':account:' + (hash >>> 0).toString(16);
}

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
  const key = await storageKey();
  let json = await AsyncStorage.getItem(key);
  if (!json && key.includes(':user:')) {
    const token = await AsyncStorage.getItem('sessionToken');
    if (token) {
      let hash = 2166136261;
      for (let i = 0; i < token.length; i++) {
        hash ^= token.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      const previous = await AsyncStorage.getItem(STORAGE_KEY + ':account:' + (hash >>> 0).toString(16));
      if (previous) {
        deserializePoiPoiState(previous);
        await AsyncStorage.setItem(key, previous);
        json = previous;
      }
    }
  }
  return json ? deserializePoiPoiState(json) : emptyState();
}

async function saveLocal(state: PoiPoiUnifiedState): Promise<void> {
  await AsyncStorage.setItem(
    await storageKey(),
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
    const token = await AsyncStorage.getItem('sessionToken');
    if (!token) throw new Error('PoiPoi sync requires login');
    const authorizedHeaders = { ...headers, Authorization: `Bearer ${token}` };

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
          ...authorizedHeaders,
        },
        body: JSON.stringify({ json: local }),
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

    let confirmedStateForSave: PoiPoiUnifiedState | undefined;
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
              ...authorizedHeaders,
            },
            body: JSON.stringify({ json: merged }),
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
      const confirmedPayload: unknown = await confirmation.json();
      if (!confirmedPayload || typeof confirmedPayload !== 'object' ||
          !('result' in confirmedPayload) ||
          !(confirmedPayload as { result?: { data?: unknown } }).result?.data) {
        throw new Error('PoiPoi state confirmation response invalid');
      }
      const confirmedResult = (confirmedPayload as { result: { data: unknown } }).result.data;
      const confirmedState = deserializePoiPoiState(JSON.stringify(
        confirmedResult && typeof confirmedResult === 'object' && 'json' in confirmedResult
          ? confirmedResult.json
          : confirmedResult
      ));
      confirmedStateForSave = confirmedState;
      const missing = merged.records.some(record =>
        !confirmedState.records.some(saved =>
          saved.category === record.category && saved.id === record.id &&
          saved.value === record.value && saved.updatedAt === record.updatedAt &&
          saved.origin === record.origin
        )
      );
      if (missing) throw new Error('PoiPoi state confirmation did not persist all records');
    }

    const finalState = confirmedStateForSave ? mergePoiPoiState(merged, confirmedStateForSave) : merged;
    await saveLocal(finalState);
    return finalState;
  });
}