import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertCircle, Users, TrendingUp, Clock } from "lucide-react";

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState<"all" | "bug" | "feature" | "suggestion" | "other">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "reviewing" | "resolved">("all");
  const feedbackStats = trpc.feedback.getStats.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const feedbackList = trpc.feedback.list.useQuery(
    {
      limit: 50,
      offset: 0,
      type: typeFilter === "all" ? undefined : typeFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
    },
    { enabled: user?.role === "admin" }
  );
  const utils = trpc.useUtils();
  const updateFeedbackStatus = trpc.feedback.updateStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.feedback.list.invalidate(),
        utils.feedback.getStats.invalidate(),
      ]);
    },
  });

  // Check if user is admin
  if (!user || user.role !== "admin") {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            このページにアクセスする権限がありません。管理者のみがアクセスできます。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const stats = feedbackStats.data?.data;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">管理者ダッシュボード</h1>
        <p className="text-gray-600 mt-2">システムの統計情報とユーザーデータを管理します</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">総フィードバック数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-gray-500 mt-1">全期間</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">新規フィードバック</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.byStatus.new || 0}</div>
            <p className="text-xs text-gray-500 mt-1">未確認</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">確認中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.byStatus.reviewing || 0}</div>
            <p className="text-xs text-gray-500 mt-1">処理中</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">解決済み</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.byStatus.resolved || 0}</div>
            <p className="text-xs text-gray-500 mt-1">完了</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="type" className="w-full">
        <TabsList>
          <TabsTrigger value="type">フィードバック種別</TabsTrigger>
          <TabsTrigger value="status">ステータス分布</TabsTrigger>
          <TabsTrigger value="items">フィードバック一覧</TabsTrigger>
        </TabsList>

        <TabsContent value="type" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>フィードバック種別の分布</CardTitle>
              <CardDescription>
                ユーザーから寄せられたフィードバックの種別ごとの件数
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { name: "バグ報告", value: stats.byType.bug },
                      { name: "機能リクエスト", value: stats.byType.feature },
                      { name: "改善提案", value: stats.byType.suggestion },
                      { name: "その他", value: stats.byType.other },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ステータス分布</CardTitle>
              <CardDescription>
                フィードバックの処理状況
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats && (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "新規", value: stats.byStatus.new },
                        { name: "確認中", value: stats.byStatus.reviewing },
                        { name: "解決済み", value: stats.byStatus.resolved },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ユーザーからのフィードバック</CardTitle>
              <CardDescription>新しいものから最大50件を表示します。ステータスを更新できます。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  種別
                  <select
                    className="rounded border px-2 py-1"
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
                  >
                    <option value="all">すべて</option>
                    <option value="bug">バグ報告</option>
                    <option value="feature">機能リクエスト</option>
                    <option value="suggestion">改善提案</option>
                    <option value="other">その他</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  状態
                  <select
                    className="rounded border px-2 py-1"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                  >
                    <option value="all">すべて</option>
                    <option value="new">新規</option>
                    <option value="reviewing">確認中</option>
                    <option value="resolved">解決済み</option>
                  </select>
                </label>
              </div>
              {updateFeedbackStatus.error && (
                <Alert variant="destructive">
                  <AlertDescription>ステータスを更新できませんでした。</AlertDescription>
                </Alert>
              )}
              {feedbackList.isLoading ? (
                <p className="text-sm text-gray-500">読み込み中...</p>
              ) : feedbackList.data?.data.length ? (
                feedbackList.data.data.map((entry) => (
                  <div key={entry.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{entry.title}</p>
                        <p className="text-xs text-gray-500">{entry.type} · {entry.status}</p>
                      </div>
                      <div className="flex gap-2">
                        {entry.status !== "reviewing" && (
                          <button
                            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                            disabled={updateFeedbackStatus.isPending}
                            onClick={() => updateFeedbackStatus.mutate({ id: entry.id, status: "reviewing" })}
                          >確認中</button>
                        )}
                        {entry.status !== "resolved" && (
                          <button
                            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                            disabled={updateFeedbackStatus.isPending}
                            onClick={() => updateFeedbackStatus.mutate({ id: entry.id, status: "resolved" })}
                          >解決済み</button>
                        )}
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{entry.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">フィードバックはまだありません。</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>システムヘルス</CardTitle>
          <CardDescription>
            プラットフォームの稼働状況
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>API サーバー</span>
              </div>
              <span className="text-sm font-medium text-green-600">正常</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>データベース</span>
              </div>
              <span className="text-sm font-medium text-green-600">正常</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>ストレージ</span>
              </div>
              <span className="text-sm font-medium text-green-600">正常</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>クイックアクション</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition text-left">
              <div className="font-medium">ユーザー管理</div>
              <p className="text-sm text-gray-600">ユーザーアカウントを管理</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition text-left">
              <div className="font-medium">フィードバック確認</div>
              <p className="text-sm text-gray-600">新規フィードバックを確認</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition text-left">
              <div className="font-medium">ログ確認</div>
              <p className="text-sm text-gray-600">システムログを確認</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
