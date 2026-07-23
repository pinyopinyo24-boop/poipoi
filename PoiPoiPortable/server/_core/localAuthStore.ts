// In-memory store for local authentication
// In production, this should be a proper database table
interface LocalAuthEntry {
  passwordHash: string;
  userId: number;
}

const authStore = new Map<string, LocalAuthEntry>();

export function storeLocalAuth(username: string, passwordHash: string, userId: number) {
  authStore.set(username, { passwordHash, userId });
}

export function getLocalAuth(username: string): LocalAuthEntry | undefined {
  return authStore.get(username);
}

export function deleteLocalAuth(username: string) {
  authStore.delete(username);
}
