/**
 * ManufacturingDashboard - ポイポイ製造管理ダッシュボード
 * 水色グラデーション、Production、Inventory、Quality、Cost統合表示
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardMetrics {
  production: {
    target: number;
    actual: number;
    efficiency: number;
    trend: Array<{ time: string; value: number }>;
  };
  inventory: {
    total: number;
    available: number;
    reserved: number;
    trend: Array<{ time: string; value: number }>;
  };
  quality: {
    defectRate: number;
    passRate: number;
    trend: Array<{ time: string; value: number }>;
  };
  cost: {
    budget: number;
    actual: number;
    variance: number;
    trend: Array<{ time: string; value: number }>;
  };
}

interface AISuggestion {
  id: string;
  category: 'production' | 'quality' | 'cost' | 'inventory';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
}

export const ManufacturingDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    production: {
      target: 1000,
      actual: 950,
      efficiency: 95,
      trend: [
        { time: '00:00', value: 900 },
        { time: '04:00', value: 920 },
        { time: '08:00', value: 950 },
        { time: '12:00', value: 960 },
        { time: '16:00', value: 950 },
        { time: '20:00', value: 940 },
      ],
    },
    inventory: {
      total: 5000,
      available: 3500,
      reserved: 1500,
      trend: [
        { time: '00:00', value: 5200 },
        { time: '04:00', value: 5100 },
        { time: '08:00', value: 5000 },
        { time: '12:00', value: 4900 },
        { time: '16:00', value: 4800 },
        { time: '20:00', value: 5000 },
      ],
    },
    quality: {
      defectRate: 2.5,
      passRate: 97.5,
      trend: [
        { time: '00:00', value: 98 },
        { time: '04:00', value: 97.5 },
        { time: '08:00', value: 97.8 },
        { time: '12:00', value: 97.5 },
        { time: '16:00', value: 97.2 },
        { time: '20:00', value: 97.5 },
      ],
    },
    cost: {
      budget: 100000,
      actual: 98500,
      variance: 1500,
      trend: [
        { time: '00:00', value: 10000 },
        { time: '04:00', value: 19500 },
        { time: '08:00', value: 29800 },
        { time: '12:00', value: 39200 },
        { time: '16:00', value: 68500 },
        { time: '20:00', value: 98500 },
      ],
    },
  });

  const [suggestions, setSuggestions] = useState<AISuggestion[]>([
    {
      id: '1',
      category: 'production',
      title: '生産効率の最適化',
      description: '現在の生産ペースから見て、午後の生産スケジュールを調整することで5%の効率向上が期待できます。',
      impact: 'high',
      confidence: 0.92,
    },
    {
      id: '2',
      category: 'quality',
      title: '品質管理の改善',
      description: '過去1週間のデータから、午前10時から11時の間に不良率が上昇する傾向があります。',
      impact: 'high',
      confidence: 0.88,
    },
    {
      id: '3',
      category: 'cost',
      title: 'コスト削減提案',
      description: '材料費の削減により、月間コストを3%削減できる可能性があります。',
      impact: 'medium',
      confidence: 0.85,
    },
    {
      id: '4',
      category: 'inventory',
      title: '在庫最適化',
      description: '現在の在庫レベルは適切ですが、今後の需要予測から見て、在庫を2%削減できます。',
      impact: 'medium',
      confidence: 0.80,
    },
  ]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'production':
        return 'border-l-4 border-blue-500';
      case 'quality':
        return 'border-l-4 border-green-500';
      case 'cost':
        return 'border-l-4 border-orange-500';
      case 'inventory':
        return 'border-l-4 border-purple-500';
      default:
        return 'border-l-4 border-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100 p-6">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-cyan-900 mb-2">
              🏭 製造管理ダッシュボード
            </h1>
            <p className="text-gray-600">
              ポイポイAIによる統合製造管理・リアルタイム監視・改善提案
            </p>
          </div>
          <div className="text-6xl">🦝</div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        {/* Production パネル */}
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-blue-900">📊 生産</h2>
              <div className="text-3xl">⚙️</div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">目標</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.production.target}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">実績</p>
                <p className="text-2xl font-bold text-cyan-600">{metrics.production.actual}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">効率</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full"
                    style={{ width: `${metrics.production.efficiency}%` }}
                  ></div>
                </div>
                <p className="text-sm font-semibold text-blue-600 mt-1">
                  {metrics.production.efficiency}%
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Inventory パネル */}
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-purple-900">📦 在庫</h2>
              <div className="text-3xl">📦</div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">合計</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.inventory.total}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">利用可能</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.inventory.available}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">予約済み</p>
                <p className="text-lg font-semibold text-orange-600">{metrics.inventory.reserved}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quality パネル */}
        <Card className="bg-gradient-to-br from-green-50 to-cyan-50 border-2 border-green-200 shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-green-900">✅ 品質</h2>
              <div className="text-3xl">✅</div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">合格率</p>
                <p className="text-2xl font-bold text-green-600">{metrics.quality.passRate}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">不良率</p>
                <p className="text-2xl font-bold text-red-600">{metrics.quality.defectRate}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ステータス</p>
                <p className="text-sm font-semibold text-green-600">✓ 良好</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Cost パネル */}
        <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-orange-900">💰 コスト</h2>
              <div className="text-3xl">💰</div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">予算</p>
                <p className="text-2xl font-bold text-orange-600">¥{metrics.cost.budget.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">実績</p>
                <p className="text-2xl font-bold text-red-600">¥{metrics.cost.actual.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">差異</p>
                <p className="text-sm font-semibold text-green-600">+¥{metrics.cost.variance.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* グラフとAI提案 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* グラフ領域 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 生産トレンド */}
          <Card className="bg-white border-2 border-blue-200 shadow-lg p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">📈 生産トレンド</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.production.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0891b2"
                  strokeWidth={2}
                  dot={{ fill: '#0891b2', r: 4 }}
                  name="生産数"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* 品質トレンド */}
          <Card className="bg-white border-2 border-green-200 shadow-lg p-6">
            <h3 className="text-lg font-bold text-green-900 mb-4">📊 品質トレンド</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.quality.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[95, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', r: 4 }}
                  name="合格率(%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* AI改善提案 */}
        <Card className="bg-gradient-to-b from-cyan-50 to-blue-50 border-2 border-cyan-300 shadow-lg p-6">
          <h3 className="text-lg font-bold text-cyan-900 mb-4">🤖 AI改善提案</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`p-3 rounded-lg ${getCategoryColor(suggestion.category)} bg-white border-l-4`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm text-gray-800">{suggestion.title}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getImpactColor(suggestion.impact)}`}>
                    {suggestion.impact === 'high' ? '高' : suggestion.impact === 'medium' ? '中' : '低'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{suggestion.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    信頼度: {(suggestion.confidence * 100).toFixed(0)}%
                  </div>
                  <Button className="text-xs bg-cyan-500 text-white hover:bg-cyan-600 h-6 px-2">
                    詳細
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* コスト分析 */}
      <Card className="mt-6 bg-white border-2 border-orange-200 shadow-lg p-6">
        <h3 className="text-lg font-bold text-orange-900 mb-4">💹 コスト分析</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={metrics.cost.trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#f97316" name="累積コスト(¥)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* アクションボタン */}
      <div className="mt-8 flex gap-4 justify-center">
        <Button className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:from-cyan-500 hover:to-blue-600 px-6 py-2 rounded-lg font-semibold">
          🤖 ポイポイに相談
        </Button>
        <Button className="bg-white text-cyan-600 border-2 border-cyan-400 hover:bg-cyan-50 px-6 py-2 rounded-lg font-semibold">
          📊 詳細レポート
        </Button>
        <Button className="bg-white text-cyan-600 border-2 border-cyan-400 hover:bg-cyan-50 px-6 py-2 rounded-lg font-semibold">
          ⚙️ 設定
        </Button>
      </div>
    </div>
  );
};
