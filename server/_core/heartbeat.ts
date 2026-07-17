import { TRPCError } from "@trpc/server";

/**
 * Heartbeat/Scheduled Jobs - Manus Forge API dependency removed
 * For local development, this is a stub implementation
 * For production, implement your own scheduled jobs backend (e.g., node-cron, Bull, APScheduler)
 */

export type HeartbeatJob = {
  name: string;
  /**
   * 6-field cron with seconds (`sec min hour dom mon dow`), UTC, min interval 60s.
   * Use `0` for the seconds field — e.g. `"0 0 9 * * *"` is daily 09:00 UTC.
   */
  cron: string;
  /** Callback path. MUST start with `/api/scheduled/`. */
  path: string;
  method?: "POST" | "PUT";
  payload?: unknown;
  description?: string;
};

export type HeartbeatJobUpdate = Partial<Omit<HeartbeatJob, "name">> & {
  enable?: boolean;
};

export type HeartbeatJobInfo = {
  taskUid: string;
  name: string;
  userId: string;
  description: string;
  cronExpression: string;
  callbackPath: string;
  callbackMethod: string;
  callbackPayload: string;
  isEnable: boolean;
  createdAt?: string | null;
  lastExecutedAt?: string | null;
  nextExecutionAt?: string | null;
};

const validateCallbackPath = (path: string): void => {
  if (!path || !path.startsWith("/api/scheduled/")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "callback path must start with /api/scheduled/",
    });
  }
};

/**
 * Create a new HTTP cron job - stub implementation for local auth
 */
export async function createHeartbeatJob(
  job: HeartbeatJob,
  userSession: string
): Promise<{ taskUid: string; nextExecutionAt?: string | null }> {
  validateCallbackPath(job.path);
  console.warn("[Heartbeat] createHeartbeatJob called but not implemented for local auth. Job:", job.name);

  return {
    taskUid: `stub-${Date.now()}`,
    nextExecutionAt: null,
  };
}

/**
 * Update an existing cron job - stub implementation for local auth
 */
export async function updateHeartbeatJob(
  taskUid: string,
  patch: HeartbeatJobUpdate,
  userSession: string
): Promise<{ nextExecutionAt?: string | null }> {
  if (patch.path !== undefined) validateCallbackPath(patch.path);
  console.warn("[Heartbeat] updateHeartbeatJob called but not implemented for local auth. TaskUid:", taskUid);

  return {
    nextExecutionAt: null,
  };
}

/**
 * Delete a cron job - stub implementation for local auth
 */
export async function deleteHeartbeatJob(
  taskUid: string,
  userSession: string
): Promise<void> {
  console.warn("[Heartbeat] deleteHeartbeatJob called but not implemented for local auth. TaskUid:", taskUid);
}

/**
 * List cron jobs - stub implementation for local auth
 */
export async function listHeartbeatJobs(
  userSession: string,
  pagination?: { page?: number; pageSize?: number }
): Promise<{ total: number; actorUserId: string; jobs: HeartbeatJobInfo[] }> {
  console.warn("[Heartbeat] listHeartbeatJobs called but not implemented for local auth");

  return {
    total: 0,
    actorUserId: "local-user",
    jobs: [],
  };
}
