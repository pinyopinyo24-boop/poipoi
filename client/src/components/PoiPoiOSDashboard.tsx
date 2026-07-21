/**
 * PoiPoi OS Dashboard - Command Center UI
 * 🦝 AI・ビジネスエンジン統合管理画面
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, AlertTriangle, Zap, Brain, Cog, TrendingUp, Clock, Activity, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

// Status Badge Component
function StatusBadge({ status }: { status: 'idle' | 'processing' | 'completed' | 'failed' | 'waiting' }) {
  const statusConfig = {
    idle: { icon: CheckCircle, label: 'アイドル', color: 'bg-green-100 text-green-800' },
    processing: { icon: Loader2, label: '処理中', color: 'bg-blue-100 text-blue-800' },
    completed: { icon: CheckCircle, label: '完了', color: 'bg-green-100 text-green-800' },
    failed: { icon: AlertCircle, label: 'エラー', color: 'bg-red-100 text-red-800' },
    waiting: { icon: Clock, label: '待機中', color: 'bg-yellow-100 text-yellow-800' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.color} border-0`}>
      <Icon className={`w-3 h-3 mr-1 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  );
}

// Provider Status Card
function ProviderStatusCard({ providerType, status }: { providerType: string; status: any }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm capitalize">{providerType}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {providerType === 'gemini' ? '🔵 Google Gemini' : '🟢 OpenAI ChatGPT'}
              </p>
            </div>
            <StatusBadge status={status?.isAvailable ? 'completed' : 'failed'} />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">モデル数</p>
              <p className="font-semibold">{status?.modelsAvailable || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">最終確認</p>
              <p className="font-semibold text-xs">
                {status?.lastChecked ? new Date(status.lastChecked).toLocaleTimeString('ja-JP') : '-'}
              </p>
            </div>
          </div>

          {status?.errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
              {status.errorMessage}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Agent Status Card
function AgentStatusCard({ agentType, status }: { agentType: string; status: string }) {
  const agentLabels: Record<string, string> = {
    design: '🎨 デザインAgent',
    implementation: '💻 実装Agent',
    review: '👀 レビューAgent',
    task: '✅ タスクAgent',
    coordinator: '🎯 コーディネーター',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{agentLabels[agentType] || agentType}</h3>
              <p className="text-xs text-muted-foreground mt-1">AI エージェント</p>
            </div>
            <StatusBadge status={status as any} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Dashboard Component
export function PoiPoiOSDashboard() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);

  // tRPC queries
  const initializeMutation = trpc.aiAgents.initialize.useMutation();
  const systemStatusQuery = trpc.aiAgents.getSystemStatus.useQuery(undefined, { enabled: initialized });
  const providerStatusesQuery = trpc.aiAgents.getProviderStatuses.useQuery(undefined, { enabled: initialized });
  const agentStatusesQuery = trpc.aiAgents.getAgentStatuses.useQuery(undefined, { enabled: initialized });

  // Initialize AI Core on mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await initializeMutation.mutateAsync();
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize AI Core:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Refresh data periodically
  useEffect(() => {
    if (!initialized) return;

    const interval = setInterval(() => {
      systemStatusQuery.refetch();
      providerStatusesQuery.refetch();
      agentStatusesQuery.refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [initialized]);

  const systemStatus = systemStatusQuery.data;
  const providerStatuses = providerStatusesQuery.data || {};
  const agentStatuses = agentStatusesQuery.data || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">AI Core を初期化中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">🦝 PoiPoi OS ダッシュボード</h1>
        <p className="text-muted-foreground">AI エージェント統合管理センター</p>
      </div>

      {/* System Overview */}
      {systemStatus && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              システム状態
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">初期化状態</p>
                <p className="text-2xl font-bold text-green-600">✓ 準備完了</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">プロバイダー</p>
                <p className="text-2xl font-bold">{systemStatus.providers?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">主プロバイダー</p>
                <p className="text-lg font-bold capitalize">{systemStatus.primaryProvider || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">最終更新</p>
                <p className="text-sm">{new Date().toLocaleTimeString('ja-JP')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Providers Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold mb-4">🔌 AI プロバイダー</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(providerStatuses).map(([providerType, status]) => (
              <ProviderStatusCard key={providerType} providerType={providerType} status={status} />
            ))}
          </div>
        </div>
      </div>

      {/* Agents Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold mb-4">🤖 AI エージェント</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(agentStatuses).map(([agentType, status]) => (
              <AgentStatusCard key={agentType} agentType={agentType} status={status as string} />
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                systemStatusQuery.refetch();
                providerStatusesQuery.refetch();
                agentStatusesQuery.refetch();
              }}
              disabled={systemStatusQuery.isLoading}
            >
              <Zap className="w-4 h-4 mr-2" />
              {systemStatusQuery.isLoading ? '更新中...' : '状態を更新'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {initializeMutation.isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">初期化エラー</h3>
                <p className="text-sm text-red-700 mt-1">
                  {initializeMutation.error?.message || 'AI Core の初期化に失敗しました'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
