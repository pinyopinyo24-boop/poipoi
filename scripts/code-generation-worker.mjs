import { runCodeGenerationWorker } from '../server/core/CodeGenerationWorker.ts';

try {
  const [userId, previewId, jobId] = process.argv.slice(2);
  if (!userId || !previewId || !jobId) throw new Error('Missing generation job arguments');
  await runCodeGenerationWorker(userId, previewId, jobId);
} catch (error) {
  console.error('[PoiPoi generation worker]', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
