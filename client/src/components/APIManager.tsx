import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Play, Settings } from "lucide-react";

interface APIEndpoint {
  id: string;
  name: string;
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  type: "REST" | "GraphQL";
  status: "active" | "inactive" | "error";
  lastUsed?: Date;
}

interface APIManagerProps {
  endpoints: APIEndpoint[];
  onAddEndpoint: (endpoint: Omit<APIEndpoint, "id" | "status" | "lastUsed">) => void;
  onRemoveEndpoint: (id: string) => void;
  onTestEndpoint: (id: string) => void;
}

export const APIManager: React.FC<APIManagerProps> = ({
  endpoints,
  onAddEndpoint,
  onRemoveEndpoint,
  onTestEndpoint,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    type: "REST" | "GraphQL";
  }>({
    name: "",
    url: "",
    method: "GET",
    type: "REST",
  });

  const handleAddEndpoint = () => {
    if (formData.name && formData.url) {
      onAddEndpoint(formData);
      setFormData({ name: "", url: "", method: "GET", type: "REST" });
      setShowForm(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "✓ アクティブ";
      case "error":
        return "✗ エラー";
      default:
        return "○ 非アクティブ";
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Endpoint Form */}
      {showForm && (
        <Card className="p-4 space-y-3">
          <h4 className="font-semibold">新しいエンドポイント</h4>
          <Input
            placeholder="API名"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            placeholder="URL"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={formData.method}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "GET" || value === "POST" || value === "PUT" || value === "DELETE") {
                  setFormData({ ...formData, method: value });
                }
              }}
              className="rounded border px-2 py-1 text-sm"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
            <select
              value={formData.type}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "REST" || value === "GraphQL") {
                  setFormData({ ...formData, type: value });
                }
              }}
              className="rounded border px-2 py-1 text-sm"
            >
              <option>REST</option>
              <option>GraphQL</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddEndpoint} className="flex-1">
              追加
            </Button>
            <Button
              onClick={() => setShowForm(false)}
              variant="outline"
              className="flex-1"
            >
              キャンセル
            </Button>
          </div>
        </Card>
      )}

      {/* Add Button */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          エンドポイントを追加
        </Button>
      )}

      {/* Endpoints List */}
      <ScrollArea className="h-96 rounded border">
        <div className="space-y-2 p-3">
          {endpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              エンドポイントがありません
            </p>
          ) : (
            endpoints.map((endpoint) => (
              <Card key={endpoint.id} className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{endpoint.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {endpoint.url}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {endpoint.method}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {endpoint.type}
                      </Badge>
                      <Badge className={`text-xs ${getStatusColor(endpoint.status)}`}>
                        {getStatusLabel(endpoint.status)}
                      </Badge>
                    </div>
                    {endpoint.lastUsed && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(endpoint.lastUsed).toLocaleTimeString("ja-JP")}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onTestEndpoint(endpoint.id)}
                      className="flex-1 gap-1"
                    >
                      <Play className="h-3 w-3" />
                      テスト
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRemoveEndpoint(endpoint.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Statistics */}
      {endpoints.length > 0 && (
        <Card className="p-3">
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="text-muted-foreground text-xs">合計</p>
              <p className="font-semibold">{endpoints.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">アクティブ</p>
              <p className="font-semibold text-green-600">
                {endpoints.filter((e) => e.status === "active").length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">エラー</p>
              <p className="font-semibold text-red-600">
                {endpoints.filter((e) => e.status === "error").length}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
