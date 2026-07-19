import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

/**
 * Advanced Features Page
 * Authentication Enhancement, Analytics Dashboard, Plugin System
 */

export function AdvancedFeaturesPage() {
  const [activeTab, setActiveTab] = useState('auth');

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">高度な機能</h1>
        <p className="text-gray-600 mt-2">認証強化、分析ダッシュボード、プラグインシステム</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="auth">認証強化</TabsTrigger>
          <TabsTrigger value="analytics">分析ダッシュボード</TabsTrigger>
          <TabsTrigger value="plugins">プラグインシステム</TabsTrigger>
        </TabsList>

        {/* Authentication Enhancement Tab */}
        <TabsContent value="auth" className="space-y-4">
          <AuthenticationEnhancementTab />
        </TabsContent>

        {/* Analytics Dashboard Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsDashboardTab />
        </TabsContent>

        {/* Plugin System Tab */}
        <TabsContent value="plugins" className="space-y-4">
          <PluginSystemTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Authentication Enhancement Tab
// ============================================================================

function AuthenticationEnhancementTab() {
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'github' | 'microsoft'>('google');
  const [totpSecret, setTotpSecret] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const generateOAuth2Url = trpc.advancedFeatures.auth.generateOAuth2Url.useMutation();
  const generateTOTPSecret = trpc.advancedFeatures.auth.generateTOTPSecret.useMutation();
  const generateBackupCodes = trpc.advancedFeatures.auth.generateBackupCodes.useMutation();

  const handleGenerateOAuth2Url = async () => {
    try {
      const result = await generateOAuth2Url.mutateAsync({ provider: selectedProvider });
      window.location.href = result.url;
    } catch (error) {
      toast.error('OAuth2 URL生成に失敗しました');
    }
  };

  const handleGenerateTOTPSecret = async () => {
    try {
      const result = await generateTOTPSecret.mutateAsync();
      setTotpSecret(result.secret);
      toast.success('TOTPシークレットを生成しました');
    } catch (error) {
      toast.error('TOTP生成に失敗しました');
    }
  };

  const handleGenerateBackupCodes = async () => {
    try {
      const result = await generateBackupCodes.mutateAsync();
      setBackupCodes(result.codes);
      toast.success('バックアップコードを生成しました');
    } catch (error) {
      toast.error('バックアップコード生成に失敗しました');
    }
  };

  return (
    <div className="space-y-6">
      {/* OAuth2 Section */}
      <Card>
        <CardHeader>
          <CardTitle>OAuth2連携</CardTitle>
          <CardDescription>Google、GitHub、Microsoftと連携</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as any)}
              className="flex-1 px-3 py-2 border rounded-md"
            >
              <option value="google">Google</option>
              <option value="github">GitHub</option>
              <option value="microsoft">Microsoft</option>
            </select>
            <Button onClick={handleGenerateOAuth2Url} disabled={generateOAuth2Url.isPending}>
              {generateOAuth2Url.isPending ? <Spinner /> : '連携する'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2FA Section */}
      <Card>
        <CardHeader>
          <CardTitle>二要素認証（2FA）</CardTitle>
          <CardDescription>TOTPとバックアップコード</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
          <div className="space-y-2">
            <h4 className="font-semibold">SMS認証</h4>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="電話番号 (+81...)"
                className="flex-1"
              />
              <Button disabled>SMS送信</Button>
            </div>
          </div>

            <h4 className="font-semibold">TOTP設定</h4>
            {totpSecret ? (
              <div className="p-3 bg-gray-100 rounded-md">
                <p className="text-sm">シークレット: {totpSecret}</p>
              </div>
            ) : (
              <Button onClick={handleGenerateTOTPSecret} disabled={generateTOTPSecret.isPending}>
                {generateTOTPSecret.isPending ? <Spinner /> : 'TOTPシークレットを生成'}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">バックアップコード</h4>
            {backupCodes.length > 0 ? (
              <div className="p-3 bg-gray-100 rounded-md max-h-40 overflow-y-auto">
                {backupCodes.map((code, i) => (
                  <p key={i} className="text-sm font-mono">
                    {code}
                  </p>
                ))}
              </div>
            ) : (
              <Button onClick={handleGenerateBackupCodes} disabled={generateBackupCodes.isPending}>
                {generateBackupCodes.isPending ? <Spinner /> : 'バックアップコードを生成'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Analytics Dashboard Tab
// ============================================================================

function AnalyticsDashboardTab() {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('month');

  const featureUsageStats = trpc.advancedFeatures.analytics.getFeatureUsageStats.useQuery({ timeRange });
  const responseTimeAnalysis = trpc.advancedFeatures.analytics.getResponseTimeAnalysis.useQuery({
    timeRange: 'day',
  });
  const errorRateMetrics = trpc.advancedFeatures.analytics.getErrorRateMetrics.useQuery({ timeRange: 'day' });
  const resourceUsage = trpc.advancedFeatures.analytics.getResourceUsage.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="day">1日</option>
          <option value="week">1週間</option>
          <option value="month">1ヶ月</option>
        </select>
      </div>

      {/* AI Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle>AI使用統計</CardTitle>
          <CardDescription>機能別の使用回数と成功率</CardDescription>
        </CardHeader>
        <CardContent>
          {featureUsageStats.isLoading ? (
            <Spinner />
          ) : featureUsageStats.data ? (
            <div className="space-y-3">
              {featureUsageStats.data.slice(0, 5).map((stat) => (
                <div key={stat.featureId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-semibold">{stat.featureName}</p>
                    <p className="text-sm text-gray-600">使用回数: {stat.usageCount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">成功率: {(stat.successRate * 100).toFixed(1)}%</p>
                    <p className="text-sm text-gray-600">平均時間: {stat.averageDuration.toFixed(0)}ms</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Response Time Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>応答時間分析</CardTitle>
          <CardDescription>パフォーマンスメトリクス</CardDescription>
        </CardHeader>
        <CardContent>
          {responseTimeAnalysis.isLoading ? (
            <Spinner />
          ) : responseTimeAnalysis.data ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded">
                <p className="text-sm text-gray-600">平均</p>
                <p className="text-2xl font-bold">{responseTimeAnalysis.data.average.toFixed(0)}ms</p>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <p className="text-sm text-gray-600">最小</p>
                <p className="text-2xl font-bold">{responseTimeAnalysis.data.min.toFixed(0)}ms</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded">
                <p className="text-sm text-gray-600">P95</p>
                <p className="text-2xl font-bold">{responseTimeAnalysis.data.p95.toFixed(0)}ms</p>
              </div>
              <div className="p-3 bg-red-50 rounded">
                <p className="text-sm text-gray-600">最大</p>
                <p className="text-2xl font-bold">{responseTimeAnalysis.data.max.toFixed(0)}ms</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Error Rate Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>エラー率</CardTitle>
          <CardDescription>エラー統計とトップエラー</CardDescription>
        </CardHeader>
        <CardContent>
          {errorRateMetrics.isLoading ? (
            <Spinner />
          ) : errorRateMetrics.data ? (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 rounded">
                <p className="text-sm text-gray-600">全体エラー率</p>
                <p className="text-2xl font-bold">{(errorRateMetrics.data.overallErrorRate * 100).toFixed(2)}%</p>
              </div>
              <div>
                <p className="font-semibold mb-2">エラータイプ別</p>
                {Object.entries(errorRateMetrics.data.errorsByType).map(([type, count]) => (
                  <div key={type} className="flex justify-between p-2 text-sm">
                    <span>{type}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Resource Usage */}
      <Card>
        <CardHeader>
          <CardTitle>リソース使用状況</CardTitle>
          <CardDescription>CPU、メモリ、ディスク</CardDescription>
        </CardHeader>
        <CardContent>
          {resourceUsage.isLoading ? (
            <Spinner />
          ) : resourceUsage.data ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded">
                <p className="text-sm text-gray-600">CPU</p>
                <p className="text-2xl font-bold">{resourceUsage.data.cpuUsage.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <p className="text-sm text-gray-600">メモリ</p>
                <p className="text-2xl font-bold">{resourceUsage.data.memoryUsage.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded">
                <p className="text-sm text-gray-600">ディスク</p>
                <p className="text-2xl font-bold">{resourceUsage.data.diskUsage.toFixed(1)}%</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Plugin System Tab
// ============================================================================

function PluginSystemTab() {
  const [searchQuery, setSearchQuery] = useState('');

  const allPlugins = trpc.advancedFeatures.plugins.getAllPlugins.useQuery();
  const searchResults = trpc.advancedFeatures.plugins.searchMarketplace.useQuery({ query: searchQuery });
  const popularPlugins = trpc.advancedFeatures.plugins.getPopularPlugins.useQuery({ limit: 5 });

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>プラグイン検索</CardTitle>
          <CardDescription>マーケットプレイスからプラグインを検索</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="プラグインを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchQuery && (
        <Card>
          <CardHeader>
            <CardTitle>検索結果</CardTitle>
          </CardHeader>
          <CardContent>
            {searchResults.isLoading ? (
              <Spinner />
            ) : searchResults.data && searchResults.data.length > 0 ? (
              <div className="space-y-3">
                {searchResults.data.map((plugin) => (
                  <div key={plugin.manifest.id} className="p-3 border rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{plugin.manifest.name}</h4>
                        <p className="text-sm text-gray-600">{plugin.description}</p>
                        <p className="text-xs text-gray-500 mt-1">作成者: {plugin.author}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">⭐ {plugin.rating.toFixed(1)}</p>
                        <p className="text-xs text-gray-600">{plugin.downloads} ダウンロード</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">検索結果がありません</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Popular Plugins */}
      <Card>
        <CardHeader>
          <CardTitle>人気のプラグイン</CardTitle>
          <CardDescription>ダウンロード数が多いプラグイン</CardDescription>
        </CardHeader>
        <CardContent>
          {popularPlugins.isLoading ? (
            <Spinner />
          ) : popularPlugins.data ? (
            <div className="space-y-3">
              {popularPlugins.data.map((plugin) => (
                <div key={plugin.manifest.id} className="p-3 bg-gray-50 rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{plugin.manifest.name}</h4>
                      <p className="text-sm text-gray-600">{plugin.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">⭐ {plugin.rating.toFixed(1)}</p>
                      <p className="text-xs text-gray-600">{plugin.downloads} ダウンロード</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Installed Plugins */}
      <Card>
        <CardHeader>
          <CardTitle>インストール済みプラグイン</CardTitle>
          <CardDescription>現在インストールされているプラグイン</CardDescription>
        </CardHeader>
        <CardContent>
          {allPlugins.isLoading ? (
            <Spinner />
          ) : allPlugins.data && allPlugins.data.length > 0 ? (
            <div className="space-y-2">
              {allPlugins.data.map((plugin) => (
                <div key={plugin.manifest.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-semibold">{plugin.manifest.name}</p>
                    <p className="text-xs text-gray-600">v{plugin.manifest.version}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">{plugin.enabled ? '有効' : '無効'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">インストール済みプラグインがありません</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
