import { sqliteTable, text, integer, real, blob, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Trained Models Table
export const trainedModels = sqliteTable(
  "trained_models",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    modelData: blob("model_data").notNull(),
    accuracy: real("accuracy"),
    loss: real("loss"),
    valAccuracy: real("val_accuracy"),
    valLoss: real("val_loss"),
    epochs: integer("epochs"),
    isActive: integer("is_active").default(1),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index("trained_models_user_id_idx").on(table.userId),
    createdAtIdx: index("trained_models_created_at_idx").on(table.createdAt),
  })
);

// Model Versions Table
export const modelVersions = sqliteTable(
  "model_versions",
  {
    id: text("id").primaryKey(),
    modelId: text("model_id")
      .notNull()
      .references(() => trainedModels.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    modelData: blob("model_data").notNull(),
    accuracy: real("accuracy"),
    loss: real("loss"),
    changeLog: text("change_log"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    modelIdIdx: index("model_versions_model_id_idx").on(table.modelId),
  })
);

// API Test Results Table
export const apiTestResults = sqliteTable(
  "api_test_results",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    method: text("method").notNull(), // GET, POST, PUT, DELETE
    statusCode: integer("status_code"),
    responseTime: integer("response_time"), // milliseconds
    success: integer("success").notNull(),
    errorMessage: text("error_message"),
    responseData: blob("response_data"),
    testType: text("test_type"), // "single", "batch", "performance", "rate_limit"
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index("api_test_results_user_id_idx").on(table.userId),
    endpointIdx: index("api_test_results_endpoint_idx").on(table.endpoint),
    createdAtIdx: index("api_test_results_created_at_idx").on(table.createdAt),
  })
);

// Collaboration Sessions Table
export const collaborationSessions = sqliteTable(
  "collaboration_sessions",
  {
    id: text("id").primaryKey(),
    createdBy: text("created_by").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    sessionData: blob("session_data"),
    isActive: integer("is_active").default(1),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    createdByIdx: index("collab_sessions_created_by_idx").on(table.createdBy),
    createdAtIdx: index("collab_sessions_created_at_idx").on(table.createdAt),
  })
);

// Collaboration Session Members Table
export const collaborationMembers = sqliteTable(
  "collaboration_members",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => collaborationSessions.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: text("role").notNull(), // "owner", "editor", "viewer"
    joinedAt: integer("joined_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    sessionIdIdx: index("collab_members_session_id_idx").on(table.sessionId),
    userIdIdx: index("collab_members_user_id_idx").on(table.userId),
  })
);

// API Integrations Table
export const apiIntegrations = sqliteTable(
  "api_integrations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    endpoint: text("endpoint").notNull(),
    method: text("method").notNull(),
    headers: blob("headers"), // JSON
    authType: text("auth_type"), // "none", "bearer", "api_key", "basic"
    authToken: text("auth_token"),
    description: text("description"),
    isActive: integer("is_active").default(1),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index("api_integrations_user_id_idx").on(table.userId),
    endpointIdx: index("api_integrations_endpoint_idx").on(table.endpoint),
  })
);

// Training Jobs Table
export const trainingJobs = sqliteTable(
  "training_jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    modelId: text("model_id"),
    name: text("name").notNull(),
    status: text("status").notNull(), // "pending", "running", "completed", "failed"
    progress: integer("progress").default(0), // 0-100
    totalEpochs: integer("total_epochs"),
    completedEpochs: integer("completed_epochs").default(0),
    currentLoss: real("current_loss"),
    currentAccuracy: real("current_accuracy"),
    errorMessage: text("error_message"),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index("training_jobs_user_id_idx").on(table.userId),
    statusIdx: index("training_jobs_status_idx").on(table.status),
    createdAtIdx: index("training_jobs_created_at_idx").on(table.createdAt),
  })
);

// Streaming Sessions Table
export const streamingSessions = sqliteTable(
  "streaming_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    sessionType: text("session_type").notNull(), // "agent", "collaboration", "training"
    status: text("status").notNull(), // "active", "paused", "completed"
    totalTokens: integer("total_tokens").default(0),
    tokensPerSecond: real("tokens_per_second"),
    startedAt: integer("started_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    completedAt: integer("completed_at", { mode: "timestamp" }),
  },
  (table) => ({
    userIdIdx: index("streaming_sessions_user_id_idx").on(table.userId),
    statusIdx: index("streaming_sessions_status_idx").on(table.status),
  })
);
