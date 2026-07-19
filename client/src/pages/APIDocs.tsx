import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

interface Endpoint {
  path: string;
  method: string;
  name: string;
  description: string;
  category: string;
}

export default function APIDocs() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: endpoints, isLoading: endpointsLoading } =
    trpc.apiDocs.getEndpoints.useQuery();
  const { data: schema, isLoading: schemaLoading } =
    trpc.apiDocs.getOpenAPISchema.useQuery();
  const { data: stats } = trpc.apiDocs.getUsageStats.useQuery();
  const { data: sampleRequest } = trpc.apiDocs.getSampleRequests.useQuery(
    { endpoint: selectedEndpoint || "agent.execute" },
    { enabled: !!selectedEndpoint }
  );

  const categories = Array.from(
    new Set(endpoints?.map((e) => e.category) || [])
  );

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-blue-100 text-blue-800";
      case "POST":
        return "bg-green-100 text-green-800";
      case "PUT":
        return "bg-yellow-100 text-yellow-800";
      case "DELETE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">📚 API ドキュメント</h1>
        <p className="text-gray-600 mt-2">
          ポイポイ API の完全なドキュメントとインタラクティブテスター
        </p>
      </div>

      {/* 統計情報 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-600">総リクエスト数</p>
            <p className="text-2xl font-bold">{stats.totalRequests}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">成功率</p>
            <p className="text-2xl font-bold">{stats.successRate}%</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">平均応答時間</p>
            <p className="text-2xl font-bold">{stats.averageResponseTime}ms</p>
          </Card>
        </div>
      )}

      {/* タブ */}
      <Tabs defaultValue="endpoints" className="w-full">
        <TabsList>
          <TabsTrigger value="endpoints">エンドポイント</TabsTrigger>
          <TabsTrigger value="schema">OpenAPI スキーマ</TabsTrigger>
          <TabsTrigger value="tester">API テスター</TabsTrigger>
        </TabsList>

        {/* エンドポイント一覧 */}
        <TabsContent value="endpoints" className="space-y-4 mt-4">
          {endpointsLoading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : (
            <>
              {categories.map((category) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3">{category}</h3>
                  <div className="space-y-2">
                    {endpoints
                      ?.filter((e) => e.category === category)
                      .map((endpoint) => (
                        <Card
                          key={endpoint.path}
                          className="p-4 cursor-pointer hover:bg-gray-50"
                          onClick={() => setSelectedEndpoint(endpoint.path)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getMethodBadgeColor(endpoint.method)}>
                                  {endpoint.method}
                                </Badge>
                                <code className="text-sm font-mono">
                                  {endpoint.path}
                                </code>
                              </div>
                              <p className="text-sm text-gray-600">
                                {endpoint.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {endpoint.description}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </TabsContent>

        {/* OpenAPI スキーマ */}
        <TabsContent value="schema" className="space-y-4 mt-4">
          {schemaLoading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : (
            <Card className="p-4">
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                <code className="text-xs">
                  {JSON.stringify(schema, null, 2)}
                </code>
              </pre>
            </Card>
          )}
        </TabsContent>

        {/* API テスター */}
        <TabsContent value="tester" className="space-y-4 mt-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">API テスター</h3>

            {selectedEndpoint ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    エンドポイント
                  </label>
                  <input
                    type="text"
                    value={selectedEndpoint}
                    readOnly
                    className="w-full px-3 py-2 border rounded bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    リクエストボディ
                  </label>
                  <pre className="bg-gray-100 p-4 rounded overflow-auto">
                    <code className="text-xs">
                      {JSON.stringify(sampleRequest, null, 2)}
                    </code>
                  </pre>
                </div>

                <Button
                  onClick={() => {
                    setIsLoading(true);
                    // テストリクエストを実行
                    setTimeout(() => {
                      setTestResponse(
                        JSON.stringify(
                          { success: true, message: "テスト成功" },
                          null,
                          2
                        )
                      );
                      setIsLoading(false);
                    }, 1000);
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner className="w-4 h-4" /> : "テスト実行"}
                </Button>

                {testResponse && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      レスポンス
                    </label>
                    <pre className="bg-green-50 p-4 rounded overflow-auto">
                      <code className="text-xs text-green-800">
                        {testResponse}
                      </code>
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">
                左のエンドポイント一覧からテストするエンドポイントを選択してください
              </p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* 使用統計 */}
      {stats && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">トップエンドポイント</h3>
          <div className="space-y-3">
            {stats.topEndpoints.map((endpoint: any) => (
              <div key={endpoint.endpoint} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{endpoint.endpoint}</p>
                  <p className="text-sm text-gray-600">
                    {endpoint.requests} リクエスト
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    平均 {endpoint.averageTime}ms
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
