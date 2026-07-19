import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  // ローカル認証状態（Manus依存なし）
  const handleLocalLogin = () => {
    navigate("/streaming");
  };

  const features = [
    {
      title: "AIエージェント",
      description: "自律型AIエージェント - テキスト生成、コード作成、データ分析、ビジネスプラン、マーケティング戦略、クリエイティブ作成など42個以上の機能を搭載",
      icon: Zap,
      path: "/streaming",
    },
    {
      title: "顔入れ替え動画",
      description: "FaceFusion v3.6.1を使った高品質な顔入れ替え動画生成。ソース画像とターゲット動画をアップロードするだけで自動生成",
      icon: Zap,
      path: "/facefusion-hybrid",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cyan-100 to-blue-200">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cyan-100 to-blue-200 p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gray-900">ポイポイ</h1>
            <p className="text-xl text-gray-600">
              次世代生産管理 & AIクリエイティブプラットフォーム
            </p>
          </div>
          <p className="text-gray-700">
            高速・高機能な AI 駆動プラットフォームで、生産管理とクリエイティブな機能を統合
          </p>
          <Button
            onClick={handleLocalLogin}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            ポイポイを始める
          </Button>
          <p className="text-xs text-gray-500">登録不要で即座に利用開始できます</p>
          <div className="pt-4 space-y-2 text-sm text-gray-600">
            <p>🚀 高速処理</p>
            <p>🎨 クリエイティブ機能</p>
            <p>🤖 AI アシスタント</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-100 to-blue-200">
      <header className="border-b border-border bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">ポイポイ</h1>
            <p className="text-sm text-muted-foreground">
              次世代生産管理 & AIクリエイティブプラットフォーム
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              ようこそ、{user?.name || user?.email || "ユーザー"}さん
            </span>
            <Button variant="outline" onClick={() => logout()}>
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">AIエージェント</h2>
            <p className="text-muted-foreground">
              自律型AIエージェントで、あらゆるタスクを実行できます
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.path}
                  className="cursor-pointer hover:shadow-lg transition-shadow bg-white"
                  onClick={() => navigate(feature.path)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="w-5 h-5" />
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">ポイポイ AIエージェントについて</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <p>
                ポイポイのAIエージェントは、自律型の知能型AIシステムです。以下のような42個以上の機能を搭載しています：
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">📝 テキスト処理</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>自動要約（複数レベル）</li>
                    <li>テキスト翻訳</li>
                    <li>テキスト生成</li>
                    <li>文法チェック・修正</li>
                    <li>キーワード抽出</li>
                    <li>センチメント分析</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">💻 コード処理</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>コード生成</li>
                    <li>コード説明</li>
                    <li>コード最適化</li>
                    <li>バグ検出</li>
                    <li>ドキュメント生成</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">📊 データ分析</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>データ分析</li>
                    <li>統計分析</li>
                    <li>トレンド予測</li>
                    <li>異常検出</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">🎯 ビジネス</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>ビジネスプラン生成</li>
                    <li>マーケティング戦略</li>
                    <li>コンテンツ生成</li>
                    <li>アイデア生成</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">🎓 教育</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>概念説明</li>
                    <li>学習計画生成</li>
                    <li>クイズ生成</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">🎨 クリエイティブ</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>ストーリー生成</li>
                    <li>詩生成</li>
                    <li>歌詞生成</li>
                    <li>ユーモア生成</li>
                    <li>動画スクリプト</li>
                  </ul>
                </div>
              </div>

              <p className="pt-2 font-semibold">
                AIエージェントをクリックして、何でもお手伝いできることをお試しください！
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border mt-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© 2026 ポイポイ - 次世代生産管理 & AIクリエイティブプラットフォーム</p>
        </div>
      </footer>
    </div>
  );
}
