import os from 'node:os';
import { adminProcedure, router } from './_core/trpc';

/** Read-only operations view. It reports configuration separately from verified connectivity. */
export const osRouter = router({
  getRuntimeStatus: adminProcedure.query(() => {
    const memory = process.memoryUsage();
    const heapLimit = memory.heapTotal || 1;
    const heapUsedPercent = Math.round((memory.heapUsed / heapLimit) * 100);
    const googleDriveConfigured = Boolean(
      process.env.GOOGLE_COLAB_CLIENT_ID &&
      process.env.GOOGLE_COLAB_CLIENT_SECRET &&
      process.env.GOOGLE_COLAB_REDIRECT_URI &&
      process.env.GOOGLE_COLAB_REFRESH_TOKEN &&
      process.env.POIPOI_PUBLIC_URL,
    );
    const providers = [
      { id: 'openai', configured: Boolean(process.env.OPENAI_API_KEY) },
      { id: 'gemini', configured: Boolean(process.env.GEMINI_API_KEY) },
      { id: 'local', configured: Boolean(process.env.LOCAL_AI_URL) },
    ];

    return {
      checkedAt: new Date().toISOString(),
      runtime: {
        status: heapUsedPercent >= 90 ? 'degraded' as const : 'running' as const,
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        platform: os.platform(),
        architecture: os.arch(),
        heapUsedBytes: memory.heapUsed,
        heapTotalBytes: memory.heapTotal,
        heapUsedPercent,
        residentMemoryBytes: memory.rss,
        systemFreeMemoryBytes: os.freemem(),
        systemTotalMemoryBytes: os.totalmem(),
      },
      components: [
        { id: 'api', status: 'running' as const, detail: 'この応答を返したAPIプロセス' },
        { id: 'database', status: process.env.DATABASE_URL ? 'configured' as const : 'missing' as const, detail: '接続設定のみ確認。DB疎通はこの画面では実行しません' },
        { id: 'google-drive-colab', status: googleDriveConfigured ? 'configured' as const : 'missing' as const, detail: 'OAuth設定の有無のみ確認。Google APIは呼び出しません' },
        ...providers.map((provider) => ({
          id: `ai-${provider.id}`,
          status: provider.configured ? 'configured' as const : 'missing' as const,
          detail: 'キー・URLの設定有無のみ確認。AIプロバイダーへ接続しません',
        })),
        { id: 'android-release-signing', status: process.env.ANDROID_KEYSTORE_PATH && process.env.ANDROID_KEYSTORE_PASSWORD ? 'configured' as const : 'missing' as const, detail: '署名設定の有無。鍵の値は表示しません' },
        { id: 'device-verification', status: 'not-verified' as const, detail: '実機による互換性・安定性検証は未実施' },
      ],
    };
  }),
});
