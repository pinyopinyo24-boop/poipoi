/**
 * Manufacturing AI Dashboard
 * 生産管理・原価管理・在庫管理の統合ダッシュボード
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface MetricCard {
  label: string;
  value: string | number;
  change: number;
  unit: string;
  trend: 'up' | 'down';
}

interface AnalysisResult {
  issues: string[];
  suggestions: string[];
  confidence: number;
}

// Mock data
const productionData = [
  { time: '00:00', output: 120, target: 150 },
  { time: '04:00', output: 145, target: 150 },
  { time: '08:00', output: 165, target: 150 },
  { time: '12:00', output: 155, target: 150 },
  { time: '16:00', output: 140, target: 150 },
  { time: '20:00', output: 130, target: 150 },
];

const costData = [
  { category: '原材料', cost: 45000 },
  { category: '労務費', cost: 25000 },
  { category: '設備', cost: 15000 },
  { category: 'その他', cost: 15000 },
];

const inventoryData = [
  { name: '部品A', stock: 850, min: 500, max: 1000 },
  { name: '部品B', stock: 320, min: 300, max: 800 },
  { name: '部品C', stock: 1200, min: 800, max: 1500 },
  { name: '部品D', stock: 450, min: 400, max: 900 },
];

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

export default function ManufacturingAIDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);

  const productionMetrics: MetricCard[] = [
    { label: '生産効率', value: '92%', change: 5, unit: '%', trend: 'up' },
    { label: '稼働率', value: '87%', change: -2, unit: '%', trend: 'down' },
    { label: '不良率', value: '2.3%', change: -0.5, unit: '%', trend: 'down' },
    { label: '今日の生産量', value: 1255, change: 8, unit: '個', trend: 'up' },
  ];

  const costMetrics: MetricCard[] = [
    { label: '総コスト', value: 100000, change: -5, unit: '円', trend: 'down' },
    { label: 'コスト削減', value: '12%', change: 3, unit: '%', trend: 'up' },
    { label: '原材料費', value: 45000, change: 2, unit: '円', trend: 'up' },
    { label: 'ROI', value: '3.2x', change: 0.5, unit: 'x', trend: 'up' },
  ];

  const inventoryMetrics: MetricCard[] = [
    { label: '総在庫', value: 2820, change: -3, unit: '個', trend: 'down' },
    { label: '在庫回転率', value: '4.5', change: 0.3, unit: '回/月', trend: 'up' },
    { label: '低在庫アイテム', value: 1, change: -1, unit: '個', trend: 'down' },
    { label: '過剰在庫', value: 2, change: 1, unit: '個', trend: 'up' },
  ];

  const handleAnalyze = async (type: 'production' | 'cost' | 'inventory') => {
    // Simulate AI analysis
    const mockResults: AnalysisResult = {
      issues: [
        `${type === 'production' ? '生産効率が低下している' : type === 'cost' ? 'コストが上昇傾向' : '在庫が不均衡'}`,
        `${type === 'production' ? '設備のメンテナンスが必要' : type === 'cost' ? '原材料費の削減余地あり' : '低在庫アイテムの補充が必要'}`,
      ],
      suggestions: [
        `${type === 'production' ? 'ラインの最適化を実施' : type === 'cost' ? 'サプライヤー交渉を検討' : 'JIT在庫管理の導入'}`,
        `${type === 'production' ? '作業員の追加研修' : type === 'cost' ? '自動化投資の検討' : 'ABC分析による優先順位付け'}`,
      ],
      confidence: 0.87,
    };
    setAnalysisResults(mockResults);
  };

  const renderMetricCard = (metric: MetricCard) => (
    <Card key={metric.label} className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">{metric.label}</p>
        {metric.trend === 'up' ? (
          <TrendingUp className="w-4 h-4 text-green-600" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-600" />
        )}
      </div>
      <p className="text-2xl font-bold text-foreground mb-1">
        {metric.value}
        <span className="text-sm text-muted-foreground ml-1">{metric.unit}</span>
      </p>
      <p className={`text-xs ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
        {metric.trend === 'up' ? '+' : ''}{metric.change}{metric.unit}
      </p>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            製造AI ダッシュボード
          </h1>
          <p className="text-lg text-muted-foreground">
            生産管理・原価管理・在庫管理の統合ビュー
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="production">生産管理</TabsTrigger>
            <TabsTrigger value="cost">原価管理</TabsTrigger>
            <TabsTrigger value="inventory">在庫管理</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Key Metrics */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                主要指標
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {productionMetrics.slice(0, 2).map(renderMetricCard)}
                {costMetrics.slice(0, 1).map(renderMetricCard)}
                {inventoryMetrics.slice(0, 1).map(renderMetricCard)}
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Production Trend */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  生産トレンド
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={productionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="output"
                      stroke="#3b82f6"
                      name="実績"
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="#ef4444"
                      name="目標"
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Cost Breakdown */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  コスト内訳
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="cost"
                    >
                      {costData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Alerts */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                アラート
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-md">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-900">
                      生産効率が低下
                    </p>
                    <p className="text-sm text-yellow-700">
                      過去1時間で5%低下しました。設備の確認をお勧めします。
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-md">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">
                      コスト削減達成
                    </p>
                    <p className="text-sm text-green-700">
                      今月のコスト削減目標を12%達成しました。
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Production Tab */}
          <TabsContent value="production" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {productionMetrics.map(renderMetricCard)}
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                生産トレンド詳細
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={productionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="output"
                    stroke="#3b82f6"
                    name="実績"
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#ef4444"
                    name="目標"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Button onClick={() => handleAnalyze('production')} className="w-full">
              🤖 AI分析を実行
            </Button>

            {analysisResults && (
              <Card className="p-6 bg-blue-50">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  AI分析結果
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">
                      検出された問題:
                    </p>
                    <ul className="space-y-1">
                      {analysisResults.issues.map((issue, i) => (
                        <li key={i} className="text-sm text-foreground">
                          • {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">
                      改善提案:
                    </p>
                    <ul className="space-y-1">
                      {analysisResults.suggestions.map((suggestion, i) => (
                        <li key={i} className="text-sm text-foreground">
                          • {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-foreground">信頼度:</p>
                    <Badge variant="default">
                      {(analysisResults.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Cost Tab */}
          <TabsContent value="cost" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {costMetrics.map(renderMetricCard)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  コスト内訳
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="cost" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  コスト削減機会
                </h3>
                <div className="space-y-3">
                  {[
                    { item: '原材料費', potential: '15%', savings: '6,750円' },
                    { item: '労務費', potential: '8%', savings: '2,000円' },
                    { item: '設備費', potential: '12%', savings: '1,800円' },
                  ].map((opp, i) => (
                    <div key={i} className="p-3 bg-background rounded-md">
                      <div className="flex justify-between mb-1">
                        <p className="font-semibold text-foreground">
                          {opp.item}
                        </p>
                        <Badge variant="secondary">{opp.potential}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        削減可能額: {opp.savings}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Button onClick={() => handleAnalyze('cost')} className="w-full">
              🤖 AI分析を実行
            </Button>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {inventoryMetrics.map(renderMetricCard)}
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                在庫レベル
              </h3>
              <div className="space-y-4">
                {inventoryData.map(item => (
                  <div key={item.name}>
                    <div className="flex justify-between mb-2">
                      <p className="font-semibold text-foreground">
                        {item.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.stock} / {item.max}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.stock < item.min
                            ? 'bg-red-600'
                            : item.stock > item.max * 0.8
                            ? 'bg-yellow-600'
                            : 'bg-green-600'
                        }`}
                        style={{
                          width: `${Math.min((item.stock / item.max) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Button onClick={() => handleAnalyze('inventory')} className="w-full">
              🤖 AI分析を実行
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
