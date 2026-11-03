// Deliberately not started with --watch. An approved job owns its own lifetime.
import { runCodeApprovalWorker } from '../server/core/CodeApprovalWorker.ts';

try {
  const [userId, previewId, jobId] = process.argv.slice(2);
  if (!userId || !previewId || !jobId) throw new Error('Missing approval job arguments');
  await runCodeApprovalWorker(userId, previewId, jobId);
} catch (error) {
  console.error('[PoiPoi approval worker]', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
