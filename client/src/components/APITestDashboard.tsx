import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

interface TestResult {
  id: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  responseTime: number;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export function APITestDashboard() {
  const [endpoint, setEndpoint] = useState("");
  const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "DELETE">("GET");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("single");

  const testEndpointMutation = (trpc as any).apiTesting?.testEndpoint?.useMutation?.() || { mutateAsync: async () => ({ success: false, statusCode: 500, responseTime: 0 }) };
  const testPerformanceMutation = (trpc as any).apiTesting?.testEndpointPerformance?.useMutation?.() || { mutateAsync: async () => ({ averageResponseTime: 0, successRate: 0 }) };

  const handleTestEndpoint = async () => {
    if (!endpoint) return;

    setIsLoading(true);
    try {
      const result = await (testEndpointMutation as any).mutateAsync({
        endpoint,
        method,
      });

      const testResult: TestResult = {
        id: `test_${Date.now()}`,
        endpoint,
        method,
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        success: result.success,
        timestamp: new Date(),
      };

      setTestResults((prev) => [testResult, ...prev]);
    } catch (error) {
      const testResult: TestResult = {
        id: `test_${Date.now()}`,
        endpoint,
        method,
        responseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };
      setTestResults((prev) => [testResult, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestPerformance = async () => {
    if (!endpoint) return;

    setIsLoading(true);
    try {
      const result = await (testPerformanceMutation as any).mutateAsync({
        endpoint,
        iterations: 10,
      });

      const testResult: TestResult = {
        id: `perf_${Date.now()}`,
        endpoint,
        method: "GET",
        responseTime: Math.round(result.averageResponseTime),
        success: result.successRate === 1.0,
        timestamp: new Date(),
      };

      setTestResults((prev) => [testResult, ...prev]);
    } catch (error) {
      console.error("Performance test error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (success: boolean, statusCode?: number) => {
    if (success) {
      return <Badge className="bg-green-500">成功</Badge>;
    }
    if (statusCode === 429) {
      return <Badge className="bg-yellow-500">レート制限</Badge>;
    }
    if (statusCode && statusCode >= 400) {
      return <Badge className="bg-red-500">エラー {statusCode}</Badge>;
    }
    return <Badge className="bg-gray-500">失敗</Badge>;
  };

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>API テスト</CardTitle>
          <CardDescription>外部API エンドポイントをテストして、パフォーマンスと互換性を確認</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="single">単一テスト</TabsTrigger>
              <TabsTrigger value="performance">パフォーマンス</TabsTrigger>
              <TabsTrigger value="history">履歴</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">エンドポイント URL</label>
                <Input
                  placeholder="https://api.example.com/endpoint"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">HTTP メソッド</label>
                <Select value={method} onValueChange={(v) => setMethod(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleTestEndpoint} disabled={isLoading || !endpoint} className="w-full">
                {isLoading ? "テスト中..." : "テスト実行"}
              </Button>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">エンドポイント URL</label>
                <Input
                  placeholder="https://api.example.com/endpoint"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                />
              </div>

              <Button onClick={handleTestPerformance} disabled={isLoading || !endpoint} className="w-full">
                {isLoading ? "テスト中..." : "パフォーマンステスト実行"}
              </Button>

              <p className="text-xs text-gray-500">10回のリクエストを実行して、平均応答時間を測定します</p>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {testResults.length === 0 ? (
                <p className="text-center text-gray-500 py-8">テスト結果がまだありません</p>
              ) : (
                <div className="space-y-2">
                  {testResults.map((result) => (
                    <Card key={result.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-mono text-sm">{result.endpoint}</p>
                          <p className="text-xs text-gray-500">
                            {result.method} • {result.responseTime}ms • {result.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.statusCode && (
                            <span className="text-xs font-mono">{result.statusCode}</span>
                          )}
                          {getStatusBadge(result.success, result.statusCode)}
                        </div>
                      </div>
                      {result.error && (
                        <p className="text-xs text-red-500 mt-2">{result.error}</p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
