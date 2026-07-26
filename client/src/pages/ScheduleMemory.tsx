/**
 * Schedule Memory Page
 * Displays schedule management and AI chat integration
 */

import React, { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, Clock, Flag, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScheduleMemoryChat } from "../components/ScheduleMemoryChat";

interface Schedule {
  [key: string]: any;
}

export default function ScheduleMemory() {
  const [activeTab, setActiveTab] = useState<"today" | "tomorrow" | "upcoming" | "add">("today");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledDate: new Date().toISOString().split("T")[0],
    startTime: "",
    endTime: "",
    priority: "medium" as const,
    status: "pending" as const,
    category: "",
    tags: "",
  });

  // tRPC hooks
  const getTodayQuery = trpc.scheduleMemory.getToday.useQuery();
  const getUpcomingQuery = trpc.scheduleMemory.getUpcoming.useQuery();
  const addScheduleMutation = trpc.scheduleMemory.addSchedule.useMutation();
  const deleteScheduleMutation = trpc.scheduleMemory.deleteSchedule.useMutation();
  const processNLQuery = trpc.scheduleMemory.processNaturalLanguage.useMutation();

  // Load today's schedules
  useEffect(() => {
    if (activeTab === "today" && getTodayQuery.data) {
      setSchedules(getTodayQuery.data.schedules || []);
      setSummary(getTodayQuery.data.summary || "");
    }
  }, [activeTab, getTodayQuery.data]);

  // Load upcoming schedules
  useEffect(() => {
    if (activeTab === "upcoming" && getUpcomingQuery.data) {
      setSchedules(getUpcomingQuery.data.schedules || []);
      setSummary(getUpcomingQuery.data.summary || "");
    }
  }, [activeTab, getUpcomingQuery.data]);

  // Handle add schedule
  const handleAddSchedule = async () => {
    if (!formData.title.trim()) {
      alert("タイトルを入力してください");
      return;
    }

    try {
      setLoading(true);
      await addScheduleMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        scheduledDate: formData.scheduledDate,
        startTime: formData.startTime || undefined,
        endTime: formData.endTime || undefined,
        priority: formData.priority,
        status: formData.status,
        category: formData.category || undefined,
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : undefined,
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        scheduledDate: new Date().toISOString().split("T")[0],
        startTime: "",
        endTime: "",
        priority: "medium",
        status: "pending",
        category: "",
        tags: "",
      });

      // Refresh data
      getTodayQuery.refetch();
      getUpcomingQuery.refetch();
      setActiveTab("today");
    } catch (error) {
      console.error("Failed to add schedule:", error);
      alert("予定の追加に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // Handle delete schedule
  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("この予定を削除してもよろしいですか？")) return;

    try {
      await deleteScheduleMutation.mutateAsync({ id });
      getTodayQuery.refetch();
      getUpcomingQuery.refetch();
    } catch (error) {
      console.error("Failed to delete schedule:", error);
      alert("予定の削除に失敗しました");
    }
  };

  // Handle natural language query
  const handleNaturalLanguageQuery = async (query: string) => {
    try {
      setLoading(true);
      const result = await processNLQuery.mutateAsync({ query });
      setSummary(result.response);
    } catch (error) {
      console.error("Failed to process query:", error);
    } finally {
      setLoading(false);
    }
  };

  // Priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Schedule Memory</h1>
            <p className="text-gray-600">AI が予定を管理・整理します</p>
          </div>

          {/* Quick AI Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Button
              onClick={() => handleNaturalLanguageQuery("今日の予定を整理して")}
              variant="outline"
              className="h-auto py-4"
            >
              📅 今日の予定
            </Button>
            <Button
              onClick={() => handleNaturalLanguageQuery("明日の予定は？")}
              variant="outline"
              className="h-auto py-4"
            >
              📆 明日の予定
            </Button>
            <Button
              onClick={() => handleNaturalLanguageQuery("今後の予定")}
              variant="outline"
              className="h-auto py-4"
            >
              📋 今後の予定
            </Button>
            <Button
              onClick={() => handleNaturalLanguageQuery("分析")}
              variant="outline"
              className="h-auto py-4"
            >
              📊 パターン分析
            </Button>
          </div>

          {/* Summary Display */}
          {summary && (
            <Card className="mb-8 bg-white border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">AI サマリー</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-gray-700 font-mono text-sm">
                  {summary}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Schedules Alert */}
          {schedules.length === 0 && summary === "" && (
            <Alert className="mb-8 border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                現在登録されている予定はありません
              </AlertDescription>
            </Alert>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-gray-200">
            {["today", "tomorrow", "upcoming", "add"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === tab
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {tab === "today" && "今日"}
                {tab === "tomorrow" && "明日"}
                {tab === "upcoming" && "今後"}
                {tab === "add" && "追加"}
              </button>
            ))}
          </div>

          {/* Content */}
          {activeTab === "add" ? (
            // Add Schedule Form
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>予定を追加</CardTitle>
                <CardDescription>新しい予定を登録します</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    タイトル *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="例: 会議、プレゼン準備"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    説明
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="詳細な説明を入力（オプション）"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      日付 *
                    </label>
                    <Input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      優先度
                    </label>
                    <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">低</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="urgent">緊急</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      開始時間
                    </label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      終了時間
                    </label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    カテゴリ
                  </label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="例: 仕事、プライベート"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    タグ（カンマ区切り）
                  </label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="例: 重要, 会議, フォローアップ"
                  />
                </div>

                <Button
                  onClick={handleAddSchedule}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? "追加中..." : "予定を追加"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            // Schedules List
            <div className="space-y-4">
              {schedules.length === 0 ? (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    現在登録されている予定はありません
                  </AlertDescription>
                </Alert>
              ) : (
                schedules.map((schedule) => (
                  <Card key={schedule.id} className="bg-white hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-800">{schedule.title}</h3>
                            <Badge className={getPriorityColor(schedule.priority)}>
                              {schedule.priority === "urgent"
                                ? "🔴 緊急"
                                : schedule.priority === "high"
                                ? "🟠 高"
                                : schedule.priority === "medium"
                                ? "🔵 中"
                                : "🟢 低"}
                            </Badge>
                            <Badge className={getStatusColor(schedule.status)}>
                              {schedule.status === "completed"
                                ? "✓ 完了"
                                : schedule.status === "in-progress"
                                ? "⏳ 進行中"
                                : schedule.status === "pending"
                                ? "⭕ 予定"
                                : "✕ キャンセル"}
                            </Badge>
                          </div>

                          {schedule.description && (
                            <p className="text-gray-600 text-sm mb-2">{schedule.description}</p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(schedule.scheduledDate).toLocaleDateString("ja-JP")}
                            </div>
                            {schedule.startTime && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {schedule.startTime}
                                {schedule.endTime && ` - ${schedule.endTime}`}
                              </div>
                            )}
                            {schedule.category && (
                              <div className="flex items-center gap-1">
                                <Flag className="w-4 h-4" />
                                {schedule.category}
                              </div>
                            )}
                          </div>

                          {schedule.tags && schedule.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {schedule.tags.map((tag: any) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">AI チャット</h2>
            <ScheduleMemoryChat />
          </div>
        </div>
      </div>
    </div>
  );
}
