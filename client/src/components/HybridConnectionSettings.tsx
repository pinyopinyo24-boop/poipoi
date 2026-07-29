/**
 * HybridConnectionSettings - UI for managing hybrid local/cloud connections
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

type ConnectionMode = 'auto' | 'local-only' | 'cloud-only';
type ConnectionType = 'local' | 'cloud';
type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'failed';

interface ConnectionState {
  type: ConnectionType;
  status: ConnectionStatus;
  lastConnected: number;
  failureCount: number;
  responseTime: number;
}

interface ConnectionStatusData {
  current: ConnectionType;
  local: ConnectionState;
  cloud: ConnectionState;
  mode: ConnectionMode;
}

export const HybridConnectionSettings: React.FC = () => {
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('auto');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch connection status
  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch('/api/hybrid/connection-status');
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data);
        setConnectionMode(data.mode);
      }
    } catch (error) {
      console.error('Failed to fetch connection status:', error);
    }
  };

  // Update connection mode
  const updateConnectionMode = async (mode: ConnectionMode) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/hybrid/set-connection-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });

      if (response.ok) {
        setConnectionMode(mode);
        await fetchConnectionStatus();
      }
    } catch (error) {
      console.error('Failed to update connection mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and setup polling
  useEffect(() => {
    fetchConnectionStatus();
    const interval = setInterval(fetchConnectionStatus, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusBadgeColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-yellow-500';
      case 'connecting':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return '接続中';
      case 'disconnected':
        return '未接続';
      case 'connecting':
        return '接続中...';
      case 'failed':
        return '接続失敗';
      default:
        return '不明';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔌 接続状態
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectionStatus ? (
            <>
              {/* Current Connection */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">現在の接続:</span>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusBadgeColor(connectionStatus.local.status)}>
                    {connectionStatus.current === 'local' ? '🏠 ローカル' : '☁️ クラウド'}
                  </Badge>
                </div>
              </div>

              {/* Local Server Status */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">🏠 ローカルサーバー</span>
                  <Badge className={getStatusBadgeColor(connectionStatus.local.status)}>
                    {getStatusLabel(connectionStatus.local.status)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>応答時間: {connectionStatus.local.responseTime}ms</p>
                  <p>失敗回数: {connectionStatus.local.failureCount}</p>
                  {connectionStatus.local.lastConnected > 0 && (
                    <p>最終接続: {new Date(connectionStatus.local.lastConnected).toLocaleString()}</p>
                  )}
                </div>
              </div>

              {/* Cloud Server Status */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">☁️ クラウドサーバー</span>
                  <Badge className={getStatusBadgeColor(connectionStatus.cloud.status)}>
                    {getStatusLabel(connectionStatus.cloud.status)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>応答時間: {connectionStatus.cloud.responseTime}ms</p>
                  <p>失敗回数: {connectionStatus.cloud.failureCount}</p>
                  {connectionStatus.cloud.lastConnected > 0 && (
                    <p>最終接続: {new Date(connectionStatus.cloud.lastConnected).toLocaleString()}</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">接続状態を読み込み中...</p>
          )}
        </CardContent>
      </Card>

      {/* Connection Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚙️ AI接続モード
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={connectionMode} onValueChange={(value) => updateConnectionMode(value as ConnectionMode)}>
            {/* Auto Mode */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted cursor-pointer">
              <RadioGroupItem value="auto" id="mode-auto" />
              <Label htmlFor="mode-auto" className="flex-1 cursor-pointer">
                <div className="font-medium">🔄 自動</div>
                <p className="text-sm text-muted-foreground">
                  ローカルサーバーが利用可能な場合は使用。
                  <br />
                  ローカルが停止している場合は自動的にクラウドに切り替え。
                </p>
              </Label>
            </div>

            {/* Local Only Mode */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted cursor-pointer">
              <RadioGroupItem value="local-only" id="mode-local" />
              <Label htmlFor="mode-local" className="flex-1 cursor-pointer">
                <div className="font-medium">🏠 ローカルのみ</div>
                <p className="text-sm text-muted-foreground">
                  常にローカルサーバーを使用。
                  <br />
                  ローカルが利用できない場合は接続失敗。
                </p>
              </Label>
            </div>

            {/* Cloud Only Mode */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted cursor-pointer">
              <RadioGroupItem value="cloud-only" id="mode-cloud" />
              <Label htmlFor="mode-cloud" className="flex-1 cursor-pointer">
                <div className="font-medium">☁️ クラウドのみ</div>
                <p className="text-sm text-muted-foreground">
                  常にクラウドサーバーを使用。
                  <br />
                  最も安定した接続を提供。
                </p>
              </Label>
            </div>
          </RadioGroup>

          <Button
            onClick={() => fetchConnectionStatus()}
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            {isLoading ? '更新中...' : '接続状態を更新'}
          </Button>
        </CardContent>
      </Card>

      {/* Information */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm">ℹ️ 情報</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• ローカルサーバーは自宅PCで実行する必要があります</p>
          <p>• クラウドサーバーは常に利用可能です</p>
          <p>• 自動モードでは接続状態を30秒ごとに確認します</p>
          <p>• データは両サーバー間で自動的に同期されます</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HybridConnectionSettings;
