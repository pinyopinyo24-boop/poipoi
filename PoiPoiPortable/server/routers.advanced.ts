import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import * as notificationService from './_core/notifications';
import * as versionControlService from './_core/versionControl';
import * as exportService from './_core/exportFunctionality';

/**
 * 通知関連のtRPCプロシージャ
 */
export const notificationRouter = {
  // 通知を作成する
  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        message: z.string(),
        type: z.enum(['info', 'success', 'warning', 'error', 'ai-event']),
        actionUrl: z.string().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await notificationService.createNotification({
        userId: ctx.user.id.toString(),
        title: input.title,
        message: input.message,
        type: input.type,
        actionUrl: input.actionUrl,
        metadata: input.metadata,
      });
    }),

  // ユーザーの通知を取得する
  getNotifications: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return await notificationService.getUserNotifications(
        ctx.user.id.toString(),
        input.limit,
        input.offset
      );
    }),

  // 未読通知を取得する
  getUnread: protectedProcedure.query(async ({ ctx }) => {
    return await notificationService.getUnreadNotifications(ctx.user.id.toString());
  }),

  // 通知を既読にする
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ input }) => {
      await notificationService.markNotificationAsRead(input.notificationId);
    }),

  // 複数の通知を既読にする
  markMultipleAsRead: protectedProcedure
    .input(z.object({ notificationIds: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await notificationService.markNotificationsAsRead(input.notificationIds);
    }),

  // 通知を削除する
  delete: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ input }) => {
      await notificationService.deleteNotification(input.notificationId);
    }),

  // 通知設定を取得する
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    return await notificationService.getNotificationSettings(ctx.user.id.toString());
  }),

  // 通知設定を更新する
  updateSettings: protectedProcedure
    .input(
      z.object({
        inAppNotifications: z.boolean().optional(),
        emailNotifications: z.boolean().optional(),
        aiEventNotifications: z.boolean().optional(),
        trainingNotifications: z.boolean().optional(),
        collaborationNotifications: z.boolean().optional(),
        apiTestNotifications: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await notificationService.updateNotificationSettings(ctx.user.id.toString(), input);
    }),

  // 通知統計を取得する
  getStats: protectedProcedure.query(async ({ ctx }) => {
    return await notificationService.getNotificationStats(ctx.user.id.toString());
  }),
};

/**
 * バージョン管理関連のtRPCプロシージャ
 */
export const versionControlRouter = {
  // 新しいバージョンを作成する
  create: protectedProcedure
    .input(
      z.object({
        entityType: z.enum(['model', 'plugin', 'document', 'config']),
        entityId: z.string(),
        entityName: z.string(),
        description: z.string().optional(),
        content: z.string().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await versionControlService.createVersion({
        userId: ctx.user.id.toString(),
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName,
        description: input.description,
        content: input.content,
        metadata: input.metadata,
        createdBy: ctx.user.id.toString(),
      });
    }),

  // エンティティのすべてのバージョンを取得する
  getEntityVersions: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      return await versionControlService.getEntityVersions(
        input.entityType,
        input.entityId,
        input.limit
      );
    }),

  // 特定のバージョンを取得する
  getVersion: protectedProcedure
    .input(z.object({ versionId: z.string() }))
    .query(async ({ input }) => {
      return await versionControlService.getVersion(input.versionId);
    }),

  // ユーザーのバージョン履歴を取得する
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return await versionControlService.getUserVersionHistory(
        ctx.user.id.toString(),
        input.limit,
        input.offset
      );
    }),

  // バージョンを復元する
  restore: protectedProcedure
    .input(
      z.object({
        versionId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await versionControlService.restoreVersion(
        input.versionId,
        ctx.user.id.toString(),
        input.reason
      );
    }),

  // バージョン間の差分を取得する
  getDiff: protectedProcedure
    .input(
      z.object({
        versionId1: z.string(),
        versionId2: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await versionControlService.getVersionDiff(input.versionId1, input.versionId2);
    }),

  // バージョンを削除する
  delete: protectedProcedure
    .input(z.object({ versionId: z.string() }))
    .mutation(async ({ input }) => {
      await versionControlService.deleteVersion(input.versionId);
    }),

  // バージョン統計を取得する
  getStats: protectedProcedure.query(async ({ ctx }) => {
    return await versionControlService.getVersionStats(ctx.user.id.toString());
  }),
};

/**
 * エクスポート関連のtRPCプロシージャ
 */
export const exportRouter = {
  // データをエクスポートする
  exportData: protectedProcedure
    .input(
      z.object({
        exportType: z.enum(['analytics', 'model', 'api-config', 'collaboration', 'training-data']),
        format: z.enum(['json', 'csv', 'xlsx', 'pdf']),
        data: z.any(),
        fileName: z.string().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await exportService.exportData({
        userId: ctx.user.id.toString(),
        exportType: input.exportType,
        format: input.format,
        data: input.data,
        fileName: input.fileName,
        metadata: input.metadata,
      });
    }),

  // 分析データをエクスポートする
  exportAnalytics: protectedProcedure
    .input(
      z.object({
        analyticsData: z.any(),
        format: z.enum(['json', 'csv']).default('json'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await exportService.exportAnalytics(
        ctx.user.id.toString(),
        input.analyticsData,
        input.format
      );
    }),

  // トレーニング済みモデルをエクスポートする
  exportModel: protectedProcedure
    .input(
      z.object({
        modelData: z.any(),
        modelName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await exportService.exportTrainedModel(
        ctx.user.id.toString(),
        input.modelData,
        input.modelName
      );
    }),

  // API設定をエクスポートする
  exportAPIConfig: protectedProcedure
    .input(z.object({ apiConfigs: z.array(z.any()) }))
    .mutation(async ({ ctx, input }) => {
      return await exportService.exportAPIConfig(ctx.user.id.toString(), input.apiConfigs);
    }),

  // コラボレーションデータをエクスポートする
  exportCollaboration: protectedProcedure
    .input(z.object({ collaborationData: z.any() }))
    .mutation(async ({ ctx, input }) => {
      return await exportService.exportCollaborationData(
        ctx.user.id.toString(),
        input.collaborationData
      );
    }),

  // トレーニングデータをエクスポートする
  exportTrainingData: protectedProcedure
    .input(
      z.object({
        trainingData: z.array(z.any()),
        format: z.enum(['json', 'csv']).default('csv'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await exportService.exportTrainingData(
        ctx.user.id.toString(),
        input.trainingData,
        input.format
      );
    }),

  // 複数のエクスポートをZIPファイルとして作成
  createBulkExport: protectedProcedure
    .input(
      z.object({
        exports: z.array(
          z.object({
            type: z.string(),
            data: z.any(),
            name: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await exportService.createBulkExport(ctx.user.id.toString(), input.exports);
    }),
};

/**
 * 高度な機能のルーター
 */
export const advancedRouter = router({
  notifications: router(notificationRouter),
  versionControl: router(versionControlRouter),
  exports: router(exportRouter),
});
