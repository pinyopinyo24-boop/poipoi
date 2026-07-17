/**
 * AI Provider Selector Screen
 * AIプロバイダー選択・比較・切替画面
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, AlertCircle, Zap, DollarSign, Globe } from 'lucide-react';

interface ProviderInfo {
  id: string;
  name: string;
  model: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  costPerToken: number;
  maxTokens: number;
  features: string[];
  description: string;
  icon: React.ReactNode;
}

const providers: ProviderInfo[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    model: 'GPT-4',
    status: 'healthy',
    responseTime: 1200,
    costPerToken: 0.00003,
    maxTokens: 8192,
    features: ['高精度', 'マルチモーダル', 'ファンクション呼び出し'],
    description: '最も高度なAIモデル。複雑なタスクに最適。',
    icon: '🚀',
  },
  {
    id: 'claude',
    name: 'Claude',
    model: 'Claude 3 Opus',
    status: 'healthy',
    responseTime: 1500,
    costPerToken: 0.000025,
    maxTokens: 100000,
    features: ['長文対応', '分析力', 'コード生成'],
    description: '長い文脈を処理できる。分析に強い。',
    icon: '🧠',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    model: 'Gemini Pro',
    status: 'healthy',
    responseTime: 800,
    costPerToken: 0.000015,
    maxTokens: 32768,
    features: ['高速', 'マルチモーダル', 'リアルタイム'],
    description: '最速のレスポンス。リアルタイム処理に最適。',
    icon: '⚡',
  },
  {
    id: 'local',
    name: 'ローカルAI',
    model: 'Ollama',
    status: 'degraded',
    responseTime: 3000,
    costPerToken: 0,
    maxTokens: 4096,
    features: ['プライベート', 'オフライン', 'カスタマイズ可能'],
    description: 'ローカル実行。プライバシー重視。',
    icon: '🔒',
  },
];

export default function AIProviderSelector() {
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([
    'openai',
    'claude',
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'unhealthy':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const handleComparisonToggle = (providerId: string) => {
    setSelectedForComparison(prev =>
      prev.includes(providerId)
        ? prev.filter(p => p !== providerId)
        : [...prev, providerId]
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            AIプロバイダー選択
          </h1>
          <p className="text-lg text-muted-foreground">
            複数のAIプロバイダーから最適なものを選択してください
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="mb-8">
          <TabsList>
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="comparison">比較</TabsTrigger>
            <TabsTrigger value="settings">設定</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {providers.map(provider => (
                <Card
                  key={provider.id}
                  className={`p-6 cursor-pointer transition-all ${
                    selectedProvider === provider.id
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:shadow-lg'
                  }`}
                  onClick={() => setSelectedProvider(provider.id)}
                >
                  {/* Icon and Status */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl">{provider.icon}</span>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(provider.status)}
                      <Badge className={getStatusColor(provider.status)}>
                        {provider.status === 'healthy'
                          ? '利用可'
                          : provider.status === 'degraded'
                          ? '低速'
                          : '利用不可'}
                      </Badge>
                    </div>
                  </div>

                  {/* Name and Model */}
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {provider.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {provider.model}
                  </p>

                  {/* Description */}
                  <p className="text-sm text-foreground mb-4">
                    {provider.description}
                  </p>

                  {/* Key Metrics */}
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-600" />
                      <span>応答時間: {provider.responseTime}ms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span>
                        コスト: ${(provider.costPerToken * 1000000).toFixed(2)}/M
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <span>トークン: {provider.maxTokens.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {provider.features.map(feature => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>

                  {/* Select Button */}
                  <Button
                    className="w-full"
                    variant={
                      selectedProvider === provider.id ? 'default' : 'outline'
                    }
                    onClick={() => setSelectedProvider(provider.id)}
                  >
                    {selectedProvider === provider.id ? '✓ 選択中' : '選択'}
                  </Button>
                </Card>
              ))}
            </div>

            {/* Selected Provider Details */}
            <Card className="mt-8 p-6 bg-card">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                選択中のプロバイダー
              </h2>
              {providers
                .filter(p => p.id === selectedProvider)
                .map(provider => (
                  <div key={provider.id} className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">プロバイダー</p>
                        <p className="text-lg font-semibold text-foreground">
                          {provider.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">モデル</p>
                        <p className="text-lg font-semibold text-foreground">
                          {provider.model}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">応答時間</p>
                        <p className="text-lg font-semibold text-foreground">
                          {provider.responseTime}ms
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">最大トークン</p>
                        <p className="text-lg font-semibold text-foreground">
                          {provider.maxTokens.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        利用可能な機能
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {provider.features.map(feature => (
                          <Badge key={feature} variant="default">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button className="w-full md:w-auto mt-4">
                      このプロバイダーで開始
                    </Button>
                  </div>
                ))}
            </Card>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison">
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                プロバイダー比較
              </h2>

              {/* Comparison Selection */}
              <div className="mb-6 flex flex-wrap gap-2">
                {providers.map(provider => (
                  <Button
                    key={provider.id}
                    variant={
                      selectedForComparison.includes(provider.id)
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() => handleComparisonToggle(provider.id)}
                  >
                    {provider.name}
                  </Button>
                ))}
              </div>

              {/* Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        項目
                      </th>
                      {selectedForComparison.map(providerId => {
                        const provider = providers.find(p => p.id === providerId);
                        return (
                          <th
                            key={providerId}
                            className="text-left py-3 px-4 font-semibold text-foreground"
                          >
                            {provider?.name}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-3 px-4 text-muted-foreground">モデル</td>
                      {selectedForComparison.map(providerId => {
                        const provider = providers.find(p => p.id === providerId);
                        return (
                          <td key={providerId} className="py-3 px-4">
                            {provider?.model}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 px-4 text-muted-foreground">応答時間</td>
                      {selectedForComparison.map(providerId => {
                        const provider = providers.find(p => p.id === providerId);
                        return (
                          <td key={providerId} className="py-3 px-4">
                            {provider?.responseTime}ms
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 px-4 text-muted-foreground">
                        コスト/M トークン
                      </td>
                      {selectedForComparison.map(providerId => {
                        const provider = providers.find(p => p.id === providerId);
                        return (
                          <td key={providerId} className="py-3 px-4">
                            ${(provider?.costPerToken || 0) * 1000000}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 px-4 text-muted-foreground">
                        最大トークン
                      </td>
                      {selectedForComparison.map(providerId => {
                        const provider = providers.find(p => p.id === providerId);
                        return (
                          <td key={providerId} className="py-3 px-4">
                            {provider?.maxTokens.toLocaleString()}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-muted-foreground">ステータス</td>
                      {selectedForComparison.map(providerId => {
                        const provider = providers.find(p => p.id === providerId);
                        return (
                          <td key={providerId} className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(provider?.status || '')}
                              <Badge className={getStatusColor(provider?.status || '')}>
                                {provider?.status}
                              </Badge>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                プロバイダー設定
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    デフォルトプロバイダー
                  </label>
                  <select
                    value={selectedProvider}
                    onChange={e => setSelectedProvider(e.target.value)}
                    className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                  >
                    {providers.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} ({provider.model})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    フォールバックプロバイダー
                  </label>
                  <select className="w-full p-2 border border-border rounded-md bg-background text-foreground">
                    <option>自動選択</option>
                    {providers.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    タイムアウト (秒)
                  </label>
                  <input
                    type="number"
                    defaultValue="30"
                    className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    リトライ回数
                  </label>
                  <input
                    type="number"
                    defaultValue="3"
                    className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                  />
                </div>

                <Button className="w-full mt-6">設定を保存</Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
