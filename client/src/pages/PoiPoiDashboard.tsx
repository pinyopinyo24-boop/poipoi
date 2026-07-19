import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PoiPoi from "@/lib/poipoi";

const poipoi = new PoiPoi({ name: "PoiPoi", version: "1.0.0", debug: true });

export default function PoiPoiDashboard() {
  const [status, setStatus] = useState<any>(null);
  const [report, setReport] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const newStatus = poipoi.getStatus();
    setStatus(newStatus);
    setReport(poipoi.getReport());
  }, [refreshCount]);

  const handleRefresh = () => {
    setRefreshCount((prev) => prev + 1);
  };

  if (!status) {
    return <div className="p-4">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white">
            🚀 PoiPoi Platform Dashboard
          </h1>
          <p className="text-gray-300">
            すべてのエンジンの統合プラットフォーム
          </p>
        </div>

        {/* Platform Info */}
        <Card className="bg-slate-700 border-slate-600 p-6 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-300">プラットフォーム</p>
              <p className="text-2xl font-bold">{status.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-300">バージョン</p>
              <p className="text-2xl font-bold">{status.version}</p>
            </div>
            <div>
              <p className="text-sm text-gray-300">稼働時間</p>
              <p className="text-2xl font-bold">{status.uptime}</p>
            </div>
          </div>
        </Card>

        {/* Engines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Evolution Engine */}
          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 p-4 text-white">
            <h3 className="font-semibold mb-3">🧬 進化エンジン</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>成功:</span>
                <Badge variant="outline">{status.engines.evolution.successful}</Badge>
              </div>
              <div className="flex justify-between">
                <span>失敗:</span>
                <Badge variant="outline">{status.engines.evolution.failed}</Badge>
              </div>
              <div className="flex justify-between">
                <span>成功率:</span>
                <Badge variant="outline">
                  {status.engines.evolution.successRate.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </Card>

          {/* Memory Engine */}
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 p-4 text-white">
            <h3 className="font-semibold mb-3">💾 メモリエンジン</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>記憶数:</span>
                <Badge variant="outline">{status.engines.memory.total}</Badge>
              </div>
              <div className="flex justify-between">
                <span>カテゴリ:</span>
                <Badge variant="outline">{status.engines.memory.categoryCount}</Badge>
              </div>
              <div className="flex justify-between">
                <span>使用率:</span>
                <Badge variant="outline">{status.engines.memory.usagePercent}%</Badge>
              </div>
            </div>
          </Card>

          {/* Code Generator */}
          <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0 p-4 text-white">
            <h3 className="font-semibold mb-3">🤖 コードジェネレータ</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>生成数:</span>
                <Badge variant="outline">{status.engines.codeGen.total}</Badge>
              </div>
              <div className="flex justify-between">
                <span>言語:</span>
                <Badge variant="outline">
                  {status.engines.codeGen.languages.join(", ")}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Test Engine */}
          <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0 p-4 text-white">
            <h3 className="font-semibold mb-3">✓ テストエンジン</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>テスト数:</span>
                <Badge variant="outline">{status.engines.test.total}</Badge>
              </div>
              <div className="flex justify-between">
                <span>成功率:</span>
                <Badge variant="outline">
                  {status.engines.test.successRate.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </Card>

          {/* Plugin Manager */}
          <Card className="bg-gradient-to-br from-pink-600 to-pink-700 border-0 p-4 text-white">
            <h3 className="font-semibold mb-3">🔌 プラグインマネージャー</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>プラグイン:</span>
                <Badge variant="outline">{status.engines.plugins.total}</Badge>
              </div>
              <div className="flex justify-between">
                <span>有効:</span>
                <Badge variant="outline">{status.engines.plugins.enabled}</Badge>
              </div>
            </div>
          </Card>

          {/* Learning Engine */}
          <Card className="bg-gradient-to-br from-cyan-600 to-cyan-700 border-0 p-4 text-white">
            <h3 className="font-semibold mb-3">📚 学習エンジン</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>学習数:</span>
                <Badge variant="outline">{status.engines.learning.total}</Badge>
              </div>
              <div className="flex justify-between">
                <span>成功率:</span>
                <Badge variant="outline">{status.engines.learning.successRate}%</Badge>
              </div>
            </div>
          </Card>

          {/* Security Engine */}
          <Card className="bg-gradient-to-br from-red-600 to-red-700 border-0 p-4 text-white">
            <h3 className="font-semibold mb-3">🔒 セキュリティエンジン</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>ログ数:</span>
                <Badge variant="outline">{status.engines.security.totalLogs}</Badge>
              </div>
              <div className="flex justify-between">
                <span>コード検査:</span>
                <Badge variant="outline">{status.engines.security.codeScans}</Badge>
              </div>
            </div>
          </Card>

          {/* AI Manager */}
          <Card className="bg-gradient-to-br from-indigo-600 to-indigo-700 border-0 p-4 text-white">
            <h3 className="font-semibold mb-3">🤖 AIマネージャー</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>AIプロバイダー:</span>
                <Badge variant="outline">{status.engines.ai.totalProviders}</Badge>
              </div>
              <div className="flex justify-between">
                <span>チャット数:</span>
                <Badge variant="outline">{status.engines.ai.chatCount}</Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Report */}
        <Card className="bg-slate-700 border-slate-600 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">📊 詳細レポート</h2>
            <Button onClick={handleRefresh} className="bg-blue-600 hover:bg-blue-700">
              🔄 更新
            </Button>
          </div>
          <pre className="bg-slate-900 text-green-400 p-4 rounded overflow-x-auto text-xs font-mono">
            {report}
          </pre>
        </Card>

        {/* Information */}
        <Card className="bg-slate-700 border-slate-600 p-6 text-white">
          <h3 className="font-semibold mb-2">ℹ️ PoiPoi について</h3>
          <p className="text-sm text-gray-300">
            PoiPoi は、次世代の AI クリエイティブプラットフォームです。
            進化エンジン、メモリエンジン、コードジェネレータ、テストエンジン、
            プラグインマネージャー、学習エンジン、セキュリティエンジン、
            AI マネージャーの 8 つのコアエンジンを統合しています。
          </p>
        </Card>
      </div>
    </div>
  );
}
