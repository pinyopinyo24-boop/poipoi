import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

interface PriorityRecommendation {
  scheduleId: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  reasoning: string;
  suggestedActions: string[];
  estimatedTime: number;
  dependencies?: string[];
}

export function PriorityRecommendations() {
  const [recommendations, setRecommendations] = useState<PriorityRecommendation[]>([]);
  const [dailyFocus, setDailyFocus] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const analyzePriorities = trpc.scheduleMemory.analyzePriorities.useQuery();
  const getDailyFocus = trpc.scheduleMemory.getDailyFocus.useQuery();
  const getTimeManagementSuggestions = trpc.scheduleMemory.getTimeManagementSuggestions.useQuery();

  useEffect(() => {
    if (analyzePriorities.data?.analysis) {
      setRecommendations(analyzePriorities.data.analysis);
    }
  }, [analyzePriorities.data]);

  useEffect(() => {
    if (getDailyFocus.data) {
      setDailyFocus(getDailyFocus.data);
    }
  }, [getDailyFocus.data]);

  useEffect(() => {
    if (getTimeManagementSuggestions.data) {
      setSuggestions(getTimeManagementSuggestions.data);
    }
  }, [getTimeManagementSuggestions.data]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "critical":
        return "🔴 緊急";
      case "high":
        return "🟠 高";
      case "medium":
        return "🟡 中";
      case "low":
        return "🟢 低";
      default:
        return priority;
    }
  };

  const isLoading = analyzePriorities.isLoading || getDailyFocus.isLoading || getTimeManagementSuggestions.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dailyFocus && (
        <Card>
          <CardHeader>
            <CardTitle>📅 本日のフォーカス</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{dailyFocus}</p>
          </CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>優先度分析</CardTitle>
            <CardDescription>{recommendations.length}件の予定を分析しました</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.map((rec) => (
              <div key={rec.scheduleId} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{rec.title}</h3>
                    <Badge className={getPriorityColor(rec.priority)}>
                      {getPriorityLabel(rec.priority)}
                    </Badge>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div>推定時間: {rec.estimatedTime}分</div>
                  </div>
                </div>

                <p className="text-sm text-gray-700">{rec.reasoning}</p>

                {rec.suggestedActions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-600">推奨アクション:</p>
                    <ul className="text-xs space-y-1">
                      {rec.suggestedActions.map((action, idx) => (
                        <li key={idx} className="text-gray-700">
                          • {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {rec.dependencies && rec.dependencies.length > 0 && (
                  <div className="text-xs text-gray-600">
                    <p className="font-semibold">依存関係: {rec.dependencies.join(", ")}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>⏰ 時間管理のヒント</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={() => {
          analyzePriorities.refetch();
          getDailyFocus.refetch();
          getTimeManagementSuggestions.refetch();
        }}
        variant="outline"
        className="w-full"
      >
        再分析
      </Button>
    </div>
  );
}
