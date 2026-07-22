/**
 * Hybrid Router - tRPC endpoints for hybrid local/cloud connections
 */

import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getConnectionManager, ConnectionMode } from '../_core/hybrid/ConnectionManager';

const connectionManager = getConnectionManager({
  localServerUrl: process.env.LOCAL_SERVER_URL || 'http://localhost:3000',
  cloudServerUrl: process.env.CLOUD_SERVER_URL || 'https://poipoi.manus.space',
  connectionMode: (process.env.CONNECTION_MODE as ConnectionMode) || 'auto',
});

export const hybridRouter = router({
  /**
   * Get current connection status
   */
  getConnectionStatus: publicProcedure.query(() => {
    return connectionManager.getConnectionStatus();
  }),

  /**
   * Set connection mode
   */
  setConnectionMode: publicProcedure
    .input(z.object({
      mode: z.enum(['auto', 'local-only', 'cloud-only']),
    }))
    .mutation(({ input }) => {
      connectionManager.setConnectionMode(input.mode);
      return {
        success: true,
        mode: connectionManager.getConnectionMode(),
      };
    }),

  /**
   * Get current connection type
   */
  getCurrentConnection: publicProcedure.query(() => {
    return {
      connection: connectionManager.getCurrentConnection(),
      serverUrl: connectionManager.getServerUrl(),
    };
  }),

  /**
   * Perform health check
   */
  performHealthCheck: publicProcedure.mutation(async () => {
    const status = connectionManager.getConnectionStatus();
    return {
      success: true,
      status,
    };
  }),

  /**
   * Get connection configuration
   */
  getConfiguration: publicProcedure.query(() => {
    const status = connectionManager.getConnectionStatus();
    return {
      mode: status.mode,
      currentConnection: status.current,
      localServerUrl: process.env.LOCAL_SERVER_URL || 'http://localhost:3000',
      cloudServerUrl: process.env.CLOUD_SERVER_URL || 'https://poipoi.manus.space',
      healthCheckInterval: 30000,
      healthCheckTimeout: 5000,
    };
  }),

  /**
   * Test connection to specific server
   */
  testConnection: publicProcedure
    .input(z.object({
      serverType: z.enum(['local', 'cloud']),
    }))
    .mutation(async ({ input }) => {
      const serverUrl = input.serverType === 'local'
        ? process.env.LOCAL_SERVER_URL || 'http://localhost:3000'
        : process.env.CLOUD_SERVER_URL || 'https://poipoi.manus.space';

      try {
        const startTime = Date.now();
        const response = await fetch(`${serverUrl}/api/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });

        const responseTime = Date.now() - startTime;

        if (response.ok) {
          return {
            success: true,
            serverType: input.serverType,
            responseTime,
            status: 'connected',
          };
        } else {
          return {
            success: false,
            serverType: input.serverType,
            responseTime,
            status: 'failed',
            error: `HTTP ${response.status}`,
          };
        }
      } catch (error) {
        const responseTime = Date.now() - Date.now();
        return {
          success: false,
          serverType: input.serverType,
          responseTime,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),
});
