import { ExportPanel } from "@/components/ExportPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

export default function ExportSettings() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Download className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">データエクスポート</h1>
        </div>
        <p className="text-gray-600">
          チャット履歴、API統計、分析結果などをCSVまたはJSON形式でダウンロードできます
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">チャット履歴</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              過去のチャット会話をダウンロード
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">API統計</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              API呼び出しの統計情報をダウンロード
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">分析結果</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              タスク分析の結果をダウンロード
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Export Panel */}
      <ExportPanel />

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>よくある質問</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">CSV形式とJSON形式の違いは？</h3>
            <p className="text-sm text-gray-600">
              CSV形式はスプレッドシートで開きやすく、JSON形式はプログラムで処理しやすいです。
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2">エクスポートしたデータはどこに保存されますか？</h3>
            <p className="text-sm text-gray-600">
              ダウンロードフォルダに自動的に保存されます。ファイル名にはタイムスタンプが含まれます。
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2">データの機密性は保証されていますか？</h3>
            <p className="text-sm text-gray-600">
              はい。エクスポートされたデータはあなたのデバイスにのみ保存され、サーバーには保存されません。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
