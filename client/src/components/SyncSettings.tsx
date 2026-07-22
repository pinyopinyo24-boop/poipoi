/**
 * SyncSettings - Data synchronization settings UI
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function SyncSettings() {
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(60000);
  const [conflictResolution, setConflictResolution] = useState<'local-wins' | 'cloud-wins' | 'merge' | 'manual'>('merge');
  const [isLoading, setIsLoading] = useState(false);

  // Get sync status
  const { data: syncStatus } = trpc.sync.getSyncStatus.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Get conflicts
  const { data: conflicts } = trpc.sync.getConflicts.useQuery(undefined, {
    refetchInterval: 10000,
  });

  // Get sync history
  const { data: syncHistory } = trpc.sync.getSyncHistory.useQuery({ limit: 10 });

  // Mutations
  const performSyncMutation = trpc.sync.performSync.useMutation();
  const updateConfigMutation = trpc.sync.updateSyncConfig.useMutation();

  const handlePerformSync = async () => {
    setIsLoading(true);
    try {
      await performSyncMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    setIsLoading(true);
    try {
      await updateConfigMutation.mutateAsync({
        autoSync,
        syncInterval,
        conflictResolution,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sync Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            同期設定
          </CardTitle>
          <CardDescription>
            ローカルとクラウド間のデータ同期を設定します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Sync Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">自動同期</p>
              <p className="text-sm text-gray-600">定期的にデータを同期</p>
            </div>
            <Switch
              checked={autoSync}
              onCheckedChange={setAutoSync}
            />
          </div>

          {/* Sync Interval */}
          <div className="space-y-2">
            <label className="font-medium">同期間隔</label>
            <Select value={String(syncInterval)} onValueChange={(v) => setSyncInterval(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30000">30秒</SelectItem>
                <SelectItem value="60000">1分</SelectItem>
                <SelectItem value="300000">5分</SelectItem>
                <SelectItem value="600000">10分</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conflict Resolution */}
          <div className="space-y-2">
            <label className="font-medium">競合解決方法</label>
            <Select value={conflictResolution} onValueChange={(v: any) => setConflictResolution(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local-wins">ローカル優先</SelectItem>
                <SelectItem value="cloud-wins">クラウド優先</SelectItem>
                <SelectItem value="merge">マージ</SelectItem>
                <SelectItem value="manual">手動選択</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleUpdateConfig} disabled={isLoading}>
            {isLoading ? '保存中...' : '設定を保存'}
          </Button>
        </CardContent>
      </Card>

      {/* Sync Status */}
      {syncStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              同期状態
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">待機中</p>
                <p className="text-2xl font-bold">{syncStatus.pendingItems}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">同期済み</p>
                <p className="text-2xl font-bold">{syncStatus.syncedItems}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">失敗</p>
                <p className="text-2xl font-bold">{syncStatus.failedItems}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">競合</p>
                <p className="text-2xl font-bold">{syncStatus.conflicts}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-sm">
                最終同期: {new Date(syncStatus.lastSyncTime).toLocaleString()}
              </p>
              <p className="text-sm">
                次回同期: {new Date(syncStatus.nextSyncTime).toLocaleString()}
              </p>
            </div>

            <Button
              onClick={handlePerformSync}
              disabled={isLoading}
              className="mt-4 w-full"
            >
              {isLoading ? '同期中...' : '今すぐ同期'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Conflicts */}
      {conflicts && conflicts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="w-5 h-5" />
              競合検出 ({conflicts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conflicts.map((conflict) => (
                <div key={conflict.id} className="bg-white p-3 rounded border border-amber-200">
                  <p className="font-medium text-sm">{conflict.target}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    ローカル更新: {new Date(conflict.localTimestamp).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600">
                    クラウド更新: {new Date(conflict.cloudTimestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync History */}
      {syncHistory && syncHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>同期履歴</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {syncHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{item.target}</p>
                    <p className="text-xs text-gray-600">{new Date(item.timestamp).toLocaleString()}</p>
                  </div>
                  <Badge variant={item.status === 'synced' ? 'default' : 'destructive'}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
