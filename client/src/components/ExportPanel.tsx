import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileJson, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ExportPanel() {
  const [selectedFormat, setSelectedFormat] = useState<"csv" | "json">("csv");
  const [isExporting, setIsExporting] = useState(false);

  const { toast } = useToast();
  const exportChatHistory = trpc.export.chatHistory.useMutation();
  const exportApiStats = trpc.export.apiStatistics.useMutation();
  const exportAnalysis = trpc.export.analysisResults.useMutation();

  const handleExport = async (type: "chat" | "api" | "analysis") => {
    setIsExporting(true);
    try {
      let result;

      switch (type) {
        case "chat":
          result = await exportChatHistory.mutateAsync({ format: selectedFormat });
          break;
        case "api":
          result = await exportApiStats.mutateAsync({ format: selectedFormat });
          break;
        case "analysis":
          result = await exportAnalysis.mutateAsync({ format: selectedFormat });
          break;
      }

      if (result.success) {
        // Create download link
        const element = document.createElement("a");
        const file = new Blob([result.content], {
          type: selectedFormat === "json" ? "application/json" : "text/csv",
        });
        element.href = URL.createObjectURL(file);
        element.download = result.fileName;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

        toast({
          title: "エクスポート完了",
          description: `${result.fileName} をダウンロードしました`,
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "エクスポートに失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <Card>
        <CardHeader>
          <CardTitle>エクスポート形式</CardTitle>
          <CardDescription>
            ダウンロードするファイルの形式を選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedFormat} onValueChange={(value: any) => setSelectedFormat(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  CSV形式
                </div>
              </SelectItem>
              <SelectItem value="json">
                <div className="flex items-center gap-2">
                  <FileJson className="w-4 h-4" />
                  JSON形式
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat">チャット履歴</TabsTrigger>
          <TabsTrigger value="api">API統計</TabsTrigger>
          <TabsTrigger value="analysis">分析結果</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>チャット履歴をエクスポート</CardTitle>
              <CardDescription>
                これまでのチャット会話をダウンロードします
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleExport("chat")}
                disabled={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    エクスポート中...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    チャット履歴をダウンロード
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API統計をエクスポート</CardTitle>
              <CardDescription>
                API呼び出しの統計情報をダウンロードします
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleExport("api")}
                disabled={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    エクスポート中...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    API統計をダウンロード
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>分析結果をエクスポート</CardTitle>
              <CardDescription>
                タスク分析の結果をダウンロードします
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleExport("analysis")}
                disabled={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    エクスポート中...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    分析結果をダウンロード
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>エクスポート履歴</CardTitle>
          <CardDescription>
            最近のエクスポート操作
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>エクスポート履歴はここに表示されます</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
