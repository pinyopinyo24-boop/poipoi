import { eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) {
        // For INSERT, explicitly set NULL for missing optional fields
        values[field] = null;
        return;
      }
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }
    // Local auth: no automatic admin role assignment

    // Ensure passwordHash is set for INSERT (can be NULL)
    if (user.passwordHash === undefined && !values.passwordHash) {
      values.passwordHash = null;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.


// Local Auth Functions
export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  try {
    // Get all users and filter by exact username match in openId
    // openId format: local_{username}_{timestamp}
    const allUsers = await db.select().from(users).where(like(users.openId, `local_%`));
    console.log("[Database] Searching for user with username:", username);
    
    // Find the user where the openId matches exactly: local_{username}_{timestamp}
    const user = allUsers.find(u => {
      const match = u.openId.match(/^local_(.+?)_(\d+)$/);
      return match && match[1] === username;
    });
    
    if (user) {
      console.log("[Database] Found user:", user.openId);
      return { ...user, passwordHash: user.passwordHash || undefined };
    }
    console.log("[Database] No user found with username:", username);
    return undefined;
  } catch (error) {
    console.error("[Database] Failed to get user by username:", error);
    return undefined;
  }
}

export async function createUser(userData: {
  username: string;
  passwordHash: string;
  name: string;
  email?: string | null;
  loginMethod?: string;
  role?: string;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create user: database not available");
    throw new Error("Database not available");
  }

  try {
    console.log("[Database] Creating user:", userData.username);
    const openId = `local_${userData.username}_${Date.now()}`;
    const email = userData.email || `${userData.username}@local`;
    const loginMethod = userData.loginMethod || "local";
    const role = (userData.role || "user") as "user" | "admin";
    const lastSignedIn = new Date();

    console.log("[Database] Inserting user with openId:", openId);
    
    // Use Drizzle insert with explicit values
    const result = await db.insert(users).values({
      openId,
      name: userData.name,
      email,
      loginMethod,
      passwordHash: userData.passwordHash,
      role,
      lastSignedIn,
    });
    
    console.log("[Database] User created successfully");
    return { openId, name: userData.name, email, loginMethod, passwordHash: userData.passwordHash, role, lastSignedIn, id: (result as any).insertId || 0, username: userData.username };
  } catch (error) {
    console.error("[Database] Failed to create user:", error);
    throw error;
  }
}

export async function updateLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user: database not available");
    return;
  }

  try {
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
  } catch (error) {
    console.error("[Database] Failed to update lastSignedIn:", error);
  }
}
