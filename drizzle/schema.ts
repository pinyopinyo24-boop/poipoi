import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, index, date, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: text("passwordHash"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Notifications table
export const notifications = mysqlTable(
  "notifications",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("userId").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: mysqlEnum("type", ["info", "success", "warning", "error", "ai-event"]).notNull(),
    actionUrl: text("actionUrl"),
    metadata: json("metadata"),
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("notifications_userId_idx").on(table.userId),
    readIdx: index("notifications_read_idx").on(table.read),
  })
);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Version control table
export const versionControl = mysqlTable(
  "version_control",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("userId").notNull(),
    entityType: mysqlEnum("entityType", ["model", "plugin", "document", "config"]).notNull(),
    entityId: varchar("entityId", { length: 255 }).notNull(),
    entityName: text("entityName").notNull(),
    version: int("version").notNull(),
    versionTag: varchar("versionTag", { length: 50 }).notNull(),
    description: text("description"),
    content: text("content"),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdBy: int("createdBy").notNull(),
  },
  (table) => ({
    userIdIdx: index("version_control_userId_idx").on(table.userId),
    entityIdx: index("version_control_entity_idx").on(table.entityType, table.entityId),
  })
);

export type VersionControl = typeof versionControl.$inferSelect;
export type InsertVersionControl = typeof versionControl.$inferInsert;

// Export data table
export const exportHistory = mysqlTable(
  "export_history",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("userId").notNull(),
    exportType: mysqlEnum("exportType", ["analytics", "model", "api-config", "collaboration", "training-data"]).notNull(),
    format: varchar("format", { length: 20 }).notNull(),
    fileName: text("fileName").notNull(),
    fileUrl: text("fileUrl"),
    fileSize: int("fileSize"),
    metadata: json("metadata"),
    status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
  },
  (table) => ({
    userIdIdx: index("export_history_userId_idx").on(table.userId),
    statusIdx: index("export_history_status_idx").on(table.status),
  })
);

export type ExportHistory = typeof exportHistory.$inferSelect;
export type InsertExportHistory = typeof exportHistory.$inferInsert;


// History table for tracking user actions
export const history = mysqlTable(
  "history",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("userId").notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    title: text("title").notNull(),
    content: text("content"),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("history_userId_idx").on(table.userId),
    typeIdx: index("history_type_idx").on(table.type),
  })
);

export type History = typeof history.$inferSelect;
export type InsertHistory = typeof history.$inferInsert;

// Long-term memory table for storing user preferences and context
export const longTermMemory = mysqlTable(
  "long_term_memory",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("userId").notNull(),
    memoryType: mysqlEnum("memoryType", ["preference", "context", "learning", "relationship", "skill"]).notNull(),
    key: varchar("key", { length: 255 }).notNull(),
    value: text("value").notNull(),
    importance: int("importance").default(1).notNull(),
    metadata: json("metadata"),
    lastAccessed: timestamp("lastAccessed").defaultNow().notNull(),
    accessCount: int("accessCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("long_term_memory_userId_idx").on(table.userId),
    memoryTypeIdx: index("long_term_memory_memoryType_idx").on(table.memoryType),
    keyIdx: index("long_term_memory_key_idx").on(table.key),
  })
);

export type LongTermMemory = typeof longTermMemory.$inferSelect;
export type InsertLongTermMemory = typeof longTermMemory.$inferInsert;

// Feedback table for user feedback collection
export const feedback = mysqlTable(
  "feedback",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    type: mysqlEnum("type", ["bug", "feature", "suggestion", "other"]).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    message: text("message").notNull(),
    email: varchar("email", { length: 320 }),
    userId: int("userId"),
    status: mysqlEnum("status", ["new", "reviewing", "resolved"]).default("new").notNull(),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("feedback_userId_idx").on(table.userId),
    typeIdx: index("feedback_type_idx").on(table.type),
    statusIdx: index("feedback_status_idx").on(table.status),
  })
);

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;

// Face Swap Results table
export const faceSwapResults = mysqlTable(
  "faceSwapResults",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("userId").notNull(),
    sourceFileName: varchar("sourceFileName", { length: 255 }).notNull(),
    targetFileName: varchar("targetFileName", { length: 255 }).notNull(),
    resultImageUrl: text("resultImageUrl").notNull(),
    resultImageKey: varchar("resultImageKey", { length: 255 }).notNull(),
    quality: mysqlEnum("quality", ["low", "medium", "high"]).default("medium").notNull(),
    processingTime: int("processingTime").notNull(), // milliseconds
    metadata: json("metadata"),
    isPublic: boolean("isPublic").default(false).notNull(),
    shareToken: varchar("shareToken", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("faceSwapResults_userId_idx").on(table.userId),
    createdAtIdx: index("faceSwapResults_createdAt_idx").on(table.createdAt),
    isPublicIdx: index("faceSwapResults_isPublic_idx").on(table.isPublic),
  })
);

export type FaceSwapResult = typeof faceSwapResults.$inferSelect;
export type InsertFaceSwapResult = typeof faceSwapResults.$inferInsert;


// Schedule table for Schedule Memory feature
export const schedules = mysqlTable(
  "schedules",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("userId").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    scheduledDate: date("scheduledDate").notNull(),
    startTime: varchar("startTime", { length: 5 }), // HH:MM format
    endTime: varchar("endTime", { length: 5 }), // HH:MM format
    priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
    status: mysqlEnum("status", ["pending", "in-progress", "completed", "cancelled"]).default("pending").notNull(),
    category: varchar("category", { length: 100 }),
    tags: json("tags"), // Array of strings
    location: text("location"),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("schedules_userId_idx").on(table.userId),
    scheduledDateIdx: index("schedules_scheduledDate_idx").on(table.scheduledDate),
    statusIdx: index("schedules_status_idx").on(table.status),
    priorityIdx: index("schedules_priority_idx").on(table.priority),
    userIdScheduledDateIdx: index("schedules_userId_scheduledDate_idx").on(table.userId, table.scheduledDate),
  })
);

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;

// Schedule Memory table for AI learning
export const scheduleMemories = mysqlTable(
  "scheduleMemories",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("userId").notNull(),
    memoryType: mysqlEnum("memoryType", ["pattern", "preference", "insight", "suggestion"]).notNull(),
    content: text("content").notNull(),
    relatedScheduleIds: json("relatedScheduleIds"), // Array of schedule IDs
    confidence: decimal("confidence", { precision: 3, scale: 2 }).default("0.50").notNull(),
    tags: json("tags"), // Array of strings
    usageCount: int("usageCount").default(0).notNull(),
    lastUsed: timestamp("lastUsed"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("scheduleMemories_userId_idx").on(table.userId),
    memoryTypeIdx: index("scheduleMemories_memoryType_idx").on(table.memoryType),
    confidenceIdx: index("scheduleMemories_confidence_idx").on(table.confidence),
  })
);

export type ScheduleMemory = typeof scheduleMemories.$inferSelect;
export type InsertScheduleMemory = typeof scheduleMemories.$inferInsert;
