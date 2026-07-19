import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

/**
 * アプリ内通知、バージョン管理、エクスポート機能を統合したコンポーネント
 */
export function AdvancedFeatures() {
  const [selectedTab, setSelectedTab] = useState('notifications');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">高度な機能</h1>
        <p className="text-muted-foreground mt-2">
          アプリ内通知、バージョン管理、データエクスポート機能を管理します
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notifications">通知</TabsTrigger>
          <TabsTrigger value="versions">バージョン</TabsTrigger>
          <TabsTrigger value="exports">エクスポート</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationsPanel />
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          <VersionControlPanel />
        </TabsContent>

        <TabsContent value="exports" className="space-y-4">
          <ExportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * 通知管理パネル
 */
function NotificationsPanel() {
  const [limit] = useState(20);
  const [offset] = useState(0);

  const { data: notifications, isLoading: notificationsLoading } =
    trpc.advanced.notifications.getNotifications.useQuery({ limit, offset });

  const { data: unreadCount } = trpc.advanced.notifications.getUnread.useQuery();
  const { data: stats } = trpc.advanced.notifications.getStats.useQuery();

  const markAsReadMutation = trpc.advanced.notifications.markAsRead.useMutation();
  const deleteNotificationMutation = trpc.advanced.notifications.delete.useMutation();

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsReadMutation.mutateAsync({ notificationId });
      toast.success('通知を既読にしました');
    } catch (error) {
      toast.error('エラーが発生しました');
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotificationMutation.mutateAsync({ notificationId });
      toast.success('通知を削除しました');
    } catch (error) {
      toast.error('エラーが発生しました');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>通知統計</CardTitle>
          <CardDescription>通知の統計情報</CardDescription>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">総通知数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">未読通知</p>
                <p className="text-2xl font-bold">{stats.unread}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">タイプ数</p>
                <p className="text-2xl font-bold">{Object.keys(stats.byType).length}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>通知一覧</CardTitle>
          <CardDescription>最新の通知を表示しています</CardDescription>
        </CardHeader>
        <CardContent>
          {notificationsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="space-y-2">
              {notifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className="p-4 border rounded-lg flex justify-between items-start hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{notification.title}</h4>
                      <Badge variant="outline">{notification.type}</Badge>
                      {!notification.read && <Badge variant="secondary">未読</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        既読
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(notification.id)}
                    >
                      削除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">通知がありません</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * バージョン管理パネル
 */
function VersionControlPanel() {
  const { data: history, isLoading: historyLoading } =
    trpc.advanced.versionControl.getHistory.useQuery({ limit: 50, offset: 0 });

  const { data: stats } = trpc.advanced.versionControl.getStats.useQuery();

  const restoreMutation = trpc.advanced.versionControl.restore.useMutation();
  const deleteMutation = trpc.advanced.versionControl.delete.useMutation();

  const handleRestore = async (versionId: string) => {
    try {
      await restoreMutation.mutateAsync({ versionId });
      toast.success('バージョンを復元しました');
    } catch (error) {
      toast.error('エラーが発生しました');
    }
  };

  const handleDelete = async (versionId: string) => {
    try {
      await deleteMutation.mutateAsync({ versionId });
      toast.success('バージョンを削除しました');
    } catch (error) {
      toast.error('エラーが発生しました');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>バージョン統計</CardTitle>
          <CardDescription>バージョン管理の統計情報</CardDescription>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">総バージョン数</p>
                <p className="text-2xl font-bold">{stats.totalVersions}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">エンティティ種別</p>
                <p className="text-2xl font-bold">{Object.keys(stats.byEntityType).length}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>バージョン履歴</CardTitle>
          <CardDescription>最新のバージョン変更を表示しています</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-2">
              {history.map((version: any) => (
                <div
                  key={version.id}
                  className="p-4 border rounded-lg flex justify-between items-start hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{version.entityName}</h4>
                      <Badge variant="outline">{version.versionTag}</Badge>
                      <Badge variant="secondary">{version.entityType}</Badge>
                    </div>
                    {version.description && (
                      <p className="text-sm text-muted-foreground mt-1">{version.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(version.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(version.id)}
                    >
                      復元
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(version.id)}
                    >
                      削除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">バージョン履歴がありません</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * エクスポートパネル
 */
function ExportPanel() {
  const [selectedExportType, setSelectedExportType] = useState<
    'analytics' | 'model' | 'api-config' | 'collaboration' | 'training-data'
  >('analytics');
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv'>('json');

  const exportMutation = trpc.advanced.exports.exportData.useMutation();

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync({
        exportType: selectedExportType,
        format: selectedFormat as any,
        data: { timestamp: new Date().toISOString() },
      });

      toast.success('データをエクスポートしました');
      // ダウンロードリンクを開く
      if (result.url) {
        window.open(result.url, '_blank');
      }
    } catch (error) {
      toast.error('エクスポートに失敗しました');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>データエクスポート</CardTitle>
          <CardDescription>データを様々な形式でエクスポートできます</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">エクスポート種別</label>
            <select
              value={selectedExportType}
              onChange={(e) =>
                setSelectedExportType(
                  e.target.value as
                    | 'analytics'
                    | 'model'
                    | 'api-config'
                    | 'collaboration'
                    | 'training-data'
                )
              }
              className="w-full mt-2 px-3 py-2 border rounded-lg"
            >
              <option value="analytics">分析データ</option>
              <option value="model">トレーニングモデル</option>
              <option value="api-config">API設定</option>
              <option value="collaboration">コラボレーションデータ</option>
              <option value="training-data">トレーニングデータ</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">ファイル形式</label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as 'json' | 'csv')}
              className="w-full mt-2 px-3 py-2 border rounded-lg"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="w-full"
          >
            {exportMutation.isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                エクスポート中...
              </>
            ) : (
              'エクスポート'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>エクスポート形式について</CardTitle>
          <CardDescription>各形式の特徴</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <h4 className="font-semibold">JSON形式</h4>
            <p className="text-muted-foreground">
              構造化データとして保存されます。プログラムでの処理に最適です。
            </p>
          </div>
          <div>
            <h4 className="font-semibold">CSV形式</h4>
            <p className="text-muted-foreground">
              表形式で保存されます。Excelなどのスプレッドシートで開くことができます。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdvancedFeatures;
