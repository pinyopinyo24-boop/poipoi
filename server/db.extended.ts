import { getDb } from "./db";

// ============ Trained Models ============
export async function saveTrainedModel(userId: string, data: {
  name: string;
  description?: string;
  modelData: Buffer;
  accuracy?: number;
  loss?: number;
  valAccuracy?: number;
  valLoss?: number;
  epochs?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = `model_${Date.now()}`;
  // Raw SQL insert for trained_models table
  try {
    await (db as any).execute(`
      INSERT INTO trained_models (id, userId, name, description, modelData, accuracy, loss, valAccuracy, valLoss, epochs, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [id, userId, data.name, data.description || null, data.modelData, data.accuracy || null, data.loss || null, data.valAccuracy || null, data.valLoss || null, data.epochs || null]);
  } catch (e) {
    console.warn("Could not save trained model:", e);
  }
  return id;
}

export async function getTrainedModels(userId: string) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await (db as any).execute(`SELECT * FROM trained_models WHERE userId = ? ORDER BY createdAt DESC`, [userId]);
    return result || [];
  } catch (e) {
    console.warn("Could not fetch trained models:", e);
    return [];
  }
}

// ============ API Test Results ============
export async function saveAPITestResult(userId: string, data: {
  endpoint: string;
  method: string;
  statusCode?: number;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = `test_${Date.now()}`;
  try {
    await (db as any).execute(`
      INSERT INTO api_test_results (id, userId, endpoint, method, statusCode, responseTime, success, errorMessage, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [id, userId, data.endpoint, data.method, data.statusCode || null, data.responseTime, data.success ? 1 : 0, data.errorMessage || null]);
  } catch (e) {
    console.warn("Could not save API test result:", e);
  }
  return id;
}

export async function getAPITestResults(userId: string, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await (db as any).execute(`
      SELECT * FROM api_test_results WHERE userId = ? ORDER BY createdAt DESC LIMIT ?
    `, [userId, limit]);
    return result || [];
  } catch (e) {
    console.warn("Could not fetch API test results:", e);
    return [];
  }
}

// ============ Training Jobs ============
export async function createTrainingJob(userId: string, data: {
  modelId?: string;
  name: string;
  totalEpochs?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = `job_${Date.now()}`;
  try {
    await (db as any).execute(`
      INSERT INTO training_jobs (id, userId, modelId, name, status, totalEpochs, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [id, userId, data.modelId || null, data.name, "pending", data.totalEpochs || null]);
  } catch (e) {
    console.warn("Could not create training job:", e);
  }
  return id;
}

export async function updateTrainingJobProgress(jobId: string, data: {
  status?: string;
  progress?: number;
  completedEpochs?: number;
  currentLoss?: number;
  currentAccuracy?: number;
  errorMessage?: string;
  completedAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const updates = [];
    const values = [];
    
    if (data.status !== undefined) {
      updates.push("status = ?");
      values.push(data.status);
    }
    if (data.progress !== undefined) {
      updates.push("progress = ?");
      values.push(data.progress);
    }
    if (data.completedEpochs !== undefined) {
      updates.push("completedEpochs = ?");
      values.push(data.completedEpochs);
    }
    if (data.currentLoss !== undefined) {
      updates.push("currentLoss = ?");
      values.push(data.currentLoss);
    }
    if (data.currentAccuracy !== undefined) {
      updates.push("currentAccuracy = ?");
      values.push(data.currentAccuracy);
    }
    if (data.errorMessage !== undefined) {
      updates.push("errorMessage = ?");
      values.push(data.errorMessage);
    }
    if (data.completedAt !== undefined) {
      updates.push("completedAt = ?");
      values.push(data.completedAt);
    }
    
    if (updates.length > 0) {
      values.push(jobId);
      await (db as any).execute(`UPDATE training_jobs SET ${updates.join(", ")} WHERE id = ?`, values);
    }
  } catch (e) {
    console.warn("Could not update training job:", e);
  }
}

export async function getTrainingJob(id: string) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await (db as any).execute(`SELECT * FROM training_jobs WHERE id = ?`, [id]);
    return result?.[0] || null;
  } catch (e) {
    console.warn("Could not fetch training job:", e);
    return null;
  }
}

export async function getUserTrainingJobs(userId: string) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await (db as any).execute(`
      SELECT * FROM training_jobs WHERE userId = ? ORDER BY createdAt DESC
    `, [userId]);
    return result || [];
  } catch (e) {
    console.warn("Could not fetch training jobs:", e);
    return [];
  }
}

// ============ Collaboration Sessions ============
export async function createCollaborationSession(userId: string, data: {
  name: string;
  description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = `session_${Date.now()}`;
  try {
    await (db as any).execute(`
      INSERT INTO collaboration_sessions (id, createdBy, name, description, createdAt)
      VALUES (?, ?, ?, ?, NOW())
    `, [id, userId, data.name, data.description || null]);
  } catch (e) {
    console.warn("Could not create collaboration session:", e);
  }
  return id;
}

export async function getCollaborationSession(id: string) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await (db as any).execute(`SELECT * FROM collaboration_sessions WHERE id = ?`, [id]);
    return result?.[0] || null;
  } catch (e) {
    console.warn("Could not fetch collaboration session:", e);
    return null;
  }
}

// ============ Streaming Sessions ============
export async function createStreamingSession(userId: string, data: {
  sessionType: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = `stream_${Date.now()}`;
  try {
    await (db as any).execute(`
      INSERT INTO streaming_sessions (id, userId, sessionType, status, startedAt)
      VALUES (?, ?, ?, ?, NOW())
    `, [id, userId, data.sessionType, "active"]);
  } catch (e) {
    console.warn("Could not create streaming session:", e);
  }
  return id;
}

export async function updateStreamingSession(id: string, data: {
  status?: string;
  totalTokens?: number;
  tokensPerSecond?: number;
  completedAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const updates = [];
    const values = [];
    
    if (data.status !== undefined) {
      updates.push("status = ?");
      values.push(data.status);
    }
    if (data.totalTokens !== undefined) {
      updates.push("totalTokens = ?");
      values.push(data.totalTokens);
    }
    if (data.tokensPerSecond !== undefined) {
      updates.push("tokensPerSecond = ?");
      values.push(data.tokensPerSecond);
    }
    if (data.completedAt !== undefined) {
      updates.push("completedAt = ?");
      values.push(data.completedAt);
    }
    
    if (updates.length > 0) {
      values.push(id);
      await (db as any).execute(`UPDATE streaming_sessions SET ${updates.join(", ")} WHERE id = ?`, values);
    }
  } catch (e) {
    console.warn("Could not update streaming session:", e);
  }
}
