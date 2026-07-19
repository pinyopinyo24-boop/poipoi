import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { trpc } from '@/lib/trpc';

interface AnalyticsDashboardProps {
  userId?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ userId }) => {
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [usageData, setUsageData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [userBehavior, setUserBehavior] = useState<any>(null);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // In production, these would be tRPC calls
        // const usage = await trpc.analytics.getUsageStatistics.query({ timeRange });
        // const performance = await trpc.analytics.getPerformanceMetrics.query({ timeRange });
        // const behavior = await trpc.analytics.getUserBehavior.query({ userId });

        // Mock data for now
        setUsageData({
          totalRequests: 1250,
          requestsByTool: {
            'text-summary': 450,
            'code-generation': 320,
            'data-analysis': 280,
            'image-processing': 200,
          },
          averageResponseTime: 2.5,
          errorRate: 0.02,
        });

        setPerformanceData({
          responseTime: [1.2, 2.1, 1.8, 2.5, 2.0, 1.9],
          errorCount: 25,
          successCount: 1225,
          throughput: 0.85,
          resourceUsage: { memory: 512, cpu: 45 },
        });

        setUserBehavior({
          sessionCount: 45,
          totalSessionTime: 12600,
          averageSessionTime: 280,
          favoriteTools: ['text-summary', 'code-generation'],
          conversionEvents: 12,
        });
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      }
    };

    fetchAnalytics();
  }, [timeRange, userId]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="w-full space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">分析ダッシュボード</h1>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="hour">1時間</TabsTrigger>
            <TabsTrigger value="day">1日</TabsTrigger>
            <TabsTrigger value="week">1週間</TabsTrigger>
            <TabsTrigger value="month">1ヶ月</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">総リクエスト数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData?.totalRequests || 0}</div>
            <p className="text-xs text-gray-500 mt-1">前日比 +12%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">平均応答時間</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData?.averageResponseTime || 0}秒</div>
            <p className="text-xs text-gray-500 mt-1">前日比 -5%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">エラー率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((usageData?.errorRate || 0) * 100).toFixed(2)}%</div>
            <p className="text-xs text-gray-500 mt-1">前日比 -2%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">スループット</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData?.throughput || 0}</div>
            <p className="text-xs text-gray-500 mt-1">前日比 +8%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="usage">使用統計</TabsTrigger>
          <TabsTrigger value="performance">パフォーマンス</TabsTrigger>
          <TabsTrigger value="behavior">ユーザー行動</TabsTrigger>
        </TabsList>

        {/* Usage Statistics */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ツール別使用統計</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(usageData?.requestsByTool || {}).map(([name, value]) => ({
                      name,
                      value,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(usageData?.requestsByTool || {}).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ツール別リクエスト数</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(usageData?.requestsByTool || {}).map(([name, value]) => ({ name, value }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Metrics */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>応答時間推移</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={(performanceData?.responseTime || []).map((time: number, index: number) => ({ time: `${index}`, value: time }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" name="応答時間(秒)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>成功・エラー率</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: '成功', value: performanceData?.successCount || 0 },
                      { name: 'エラー', value: performanceData?.errorCount || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Behavior */}
        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ユーザー行動分析</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">セッション数</p>
                  <p className="text-2xl font-bold">{userBehavior?.sessionCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">平均セッション時間</p>
                  <p className="text-2xl font-bold">{Math.floor((userBehavior?.averageSessionTime || 0) / 60)}分</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">総セッション時間</p>
                  <p className="text-2xl font-bold">{Math.floor((userBehavior?.totalSessionTime || 0) / 60)}分</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">コンバージョンイベント</p>
                  <p className="text-2xl font-bold">{userBehavior?.conversionEvents || 0}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">よく使用するツール</p>
                <div className="space-y-2">
                  {(userBehavior?.favoriteTools || []).map((tool: string, index: number) => (
                    <div key={tool} className="flex items-center justify-between">
                      <span className="text-sm">{index + 1}. {tool}</span>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${100 - index * 20}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
