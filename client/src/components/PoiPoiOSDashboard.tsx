/**
 * PoiPoi OS Dashboard - Command Center UI
 * 🦝 AI・ビジネスエンジン統合管理画面
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, AlertTriangle, Zap, Brain, Cog, TrendingUp, Clock, Activity } from 'lucide-react';

// Engine Status Types
interface EngineStatus {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'degraded';
  uptime?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  lastCheck?: string;
  category: 'ai' | 'business' | 'system';
}

interface SystemStatus {
  overallHealth: 'healthy' | 'degraded' | 'error';
  uptime: number;
  runningEngines: number;
  totalEngines: number;
  lastCheck: string;
  cpuUsage: number;
  memoryUsage: number;
}

// Mock data for demo
const mockEngines: EngineStatus[] = [
  // AI Engines
  { name: 'EvolutionEngine', status: 'running', category: 'ai', cpuUsage: 12, memoryUsage: 24, uptime: 3600 },
  { name: 'MemoryEngine', status: 'running', category: 'ai', cpuUsage: 8, memoryUsage: 18, uptime: 3600 },
  { name: 'LearningEngine', status: 'running', category: 'ai', cpuUsage: 15, memoryUsage: 32, uptime: 3600 },
  { name: 'SecurityEngine', status: 'running', category: 'ai', cpuUsage: 5, memoryUsage: 12, uptime: 3600 },
  { name: 'ReasoningEngine', status: 'degraded', category: 'ai', cpuUsage: 45, memoryUsage: 68, uptime: 1800 },
  { name: 'VisionEngine', status: 'running', category: 'ai', cpuUsage: 22, memoryUsage: 45, uptime: 3600 },
  { name: 'VoiceEngine', status: 'running', category: 'ai', cpuUsage: 10, memoryUsage: 20, uptime: 3600 },
  { name: 'BrainEngine', status: 'running', category: 'ai', cpuUsage: 18, memoryUsage: 35, uptime: 3600 },
  
  // Business Engines
  { name: 'ProductionEngine', status: 'running', category: 'business', cpuUsage: 14, memoryUsage: 28, uptime: 3600 },
  { name: 'InventoryEngine', status: 'running', category: 'business', cpuUsage: 11, memoryUsage: 22, uptime: 3600 },
  { name: 'CostEngine', status: 'running', category: 'business', cpuUsage: 7, memoryUsage: 15, uptime: 3600 },
  { name: 'PlanningEngine', status: 'running', category: 'business', cpuUsage: 13, memoryUsage: 26, uptime: 3600 },
  { name: 'AutomationEngine', status: 'running', category: 'business', cpuUsage: 9, memoryUsage: 19, uptime: 3600 },
  { name: 'DashboardEngine', status: 'running', category: 'business', cpuUsage: 6, memoryUsage: 14, uptime: 3600 },
  { name: 'TestEngine', status: 'running', category: 'business', cpuUsage: 16, memoryUsage: 30, uptime: 3600 },
];

const mockSystemStatus: SystemStatus = {
  overallHealth: 'healthy',
  uptime: 86400,
  runningEngines: 14,
  totalEngines: 15,
  lastCheck: new Date().toISOString(),
  cpuUsage: 12,
  memoryUsage: 28,
};

// Status Badge Component
function StatusBadge({ status }: { status: EngineStatus['status'] }) {
  const statusConfig = {
    running: { icon: CheckCircle, label: '実行中', color: 'bg-green-100 text-green-800' },
    stopped: { icon: AlertCircle, label: '停止', color: 'bg-gray-100 text-gray-800' },
    error: { icon: AlertCircle, label: 'エラー', color: 'bg-red-100 text-red-800' },
    degraded: { icon: AlertTriangle, label: '低下', color: 'bg-yellow-100 text-yellow-800' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.color} border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

// Engine Card Component
function EngineCard({ engine }: { engine: EngineStatus }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{engine.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {engine.category === 'ai' ? '🧠 AI エンジン' : '📦 ビジネスエンジン'}
              </p>
            </div>
            <StatusBadge status={engine.status} />
          </div>

          {engine.cpuUsage !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">CPU使用率</span>
                <span className="font-medium">{engine.cpuUsage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    engine.cpuUsage > 50 ? 'bg-red-500' : engine.cpuUsage > 30 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${engine.cpuUsage}%` }}
                />
              </div>
            </div>
          )}

          {engine.memoryUsage !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">メモリ使用率</span>
                <span className="font-medium">{engine.memoryUsage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    engine.memoryUsage > 70 ? 'bg-red-500' : engine.memoryUsage > 50 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${engine.memoryUsage}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs h-8">
              詳細
            </Button>
            <Button size="sm" variant="ghost" className="flex-1 text-xs h-8">
              {engine.status === 'running' ? '停止' : '起動'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// System Status Overview Card
function SystemStatusCard({ status }: { status: SystemStatus }) {
  const healthConfig = {
    healthy: { icon: CheckCircle, label: '健全', color: 'text-green-600', bgColor: 'bg-green-50' },
    degraded: { icon: AlertTriangle, label: '低下', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    error: { icon: AlertCircle, label: 'エラー', color: 'text-red-600', bgColor: 'bg-red-50' },
  };

  const config = healthConfig[status.overallHealth];
  const HealthIcon = config.icon;

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}時間 ${minutes}分`;
  };

  return (
    <Card className={config.bgColor}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HealthIcon className={`w-5 h-5 ${config.color}`} />
              システムステータス
            </CardTitle>
            <CardDescription>全体の健全性: {config.label}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">稼働時間</p>
            <p className="text-lg font-semibold">{formatUptime(status.uptime)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">実行中エンジン</p>
            <p className="text-lg font-semibold">{status.runningEngines}/{status.totalEngines}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">CPU使用率</p>
            <p className="text-lg font-semibold">{status.cpuUsage}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">メモリ使用率</p>
            <p className="text-lg font-semibold">{status.memoryUsage}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Dashboard Component
export default function PoiPoiOSDashboard() {
  const [engines] = useState<EngineStatus[]>(mockEngines);
  const [systemStatus] = useState<SystemStatus>(mockSystemStatus);
  const [refreshing, setRefreshing] = useState(false);

  const aiEngines = engines.filter(e => e.category === 'ai');
  const businessEngines = engines.filter(e => e.category === 'business');

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <span className="text-4xl">🦝</span>
              PoiPoi OS ダッシュボード
            </h1>
            <p className="text-muted-foreground mt-2">AI・ビジネスエンジン統合管理センター</p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} size="lg" className="gap-2">
            <Activity className="w-4 h-4" />
            {refreshing ? '更新中...' : '更新'}
          </Button>
        </div>

        {/* System Status Overview */}
        <SystemStatusCard status={systemStatus} />

        {/* AI Engines Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-bold">🧠 AI エンジン ({aiEngines.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {aiEngines.map(engine => (
              <EngineCard key={engine.name} engine={engine} />
            ))}
          </div>
        </div>

        {/* Business Engines Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Cog className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold">📦 ビジネスエンジン ({businessEngines.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {businessEngines.map(engine => (
              <EngineCard key={engine.name} engine={engine} />
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                平均パフォーマンス
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87%</div>
              <p className="text-xs text-muted-foreground mt-1">前回比 +5%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" />
                応答時間
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">124ms</div>
              <p className="text-xs text-muted-foreground mt-1">平均値</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                最終チェック
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">今</div>
              <p className="text-xs text-muted-foreground mt-1">リアルタイム監視中</p>
            </CardContent>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>最終更新: {new Date().toLocaleString('ja-JP')}</p>
          <p className="mt-1">🦝 PoiPoi OS v1.0 - Command Center Ready</p>
        </div>
      </div>
    </div>
  );
}
