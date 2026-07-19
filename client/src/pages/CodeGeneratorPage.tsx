import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import CodeGenerator, { type CodeType } from "@/lib/codeGenerator";

const codeGenerator = new CodeGenerator();

export default function CodeGeneratorPage() {
  const [codeType, setCodeType] = useState<CodeType>("function");
  const [codeName, setCodeName] = useState("myFunction");
  const [language, setLanguage] = useState<"javascript" | "typescript">("typescript");
  const [generatedCode, setGeneratedCode] = useState("");
  const [validationResult, setValidationResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const handleGenerate = () => {
    try {
      const result = codeGenerator.generate(codeType, codeName, language);
      setGeneratedCode(result.code);
      setHistory(codeGenerator.getRecent(5));
      setStats(codeGenerator.getStats());
      setValidationResult(null);
    } catch (error) {
      console.error("Generation error:", error);
    }
  };

  const handleValidate = () => {
    const result = codeGenerator.validate(generatedCode);
    setValidationResult(result);
  };

  const handleOptimize = () => {
    const optimized = codeGenerator.optimize(generatedCode);
    setGeneratedCode(optimized);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    alert("コードをコピーしました");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            🤖 PoiPoi CodeGenerator
          </h1>
          <p className="text-gray-600">
            テンプレートベースのコード自動生成エンジン
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <Card className="lg:col-span-1 p-6 space-y-4">
            <h2 className="text-lg font-semibold">⚙️ 生成設定</h2>

            <div className="space-y-2">
              <label className="text-sm font-medium">コードタイプ</label>
              <select
                value={codeType}
                onChange={(e) => setCodeType(e.target.value as CodeType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="function">関数</option>
                <option value="class">クラス</option>
                <option value="api">API</option>
                <option value="component">コンポーネント</option>
                <option value="hook">フック</option>
                <option value="util">ユーティリティ</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">名前</label>
              <Input
                value={codeName}
                onChange={(e) => setCodeName(e.target.value)}
                placeholder="関数/クラス名"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">言語</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
              </select>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleGenerate}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                ✨ 生成
              </Button>
            </div>
          </Card>

          {/* Code Display */}
          <Card className="lg:col-span-2 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">📝 生成されたコード</h2>
              <div className="space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOptimize}
                  disabled={!generatedCode}
                >
                  🔧 最適化
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleValidate}
                  disabled={!generatedCode}
                >
                  ✓ 検証
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  disabled={!generatedCode}
                >
                  📋 コピー
                </Button>
              </div>
            </div>

            {generatedCode ? (
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto font-mono text-sm">
                <pre>{generatedCode}</pre>
              </div>
            ) : (
              <div className="bg-gray-100 p-8 rounded-lg text-center text-gray-500">
                コードを生成してください
              </div>
            )}

            {validationResult && (
              <div
                className={`p-4 rounded-lg ${
                  validationResult.success
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <p className="font-semibold text-sm mb-2">
                  {validationResult.success ? "✅" : "❌"} {validationResult.message}
                </p>
                {validationResult.errors && (
                  <div className="text-xs text-red-700 space-y-1">
                    {validationResult.errors.map((err: string, i: number) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                )}
                {validationResult.warnings && (
                  <div className="text-xs text-yellow-700 space-y-1 mt-2">
                    {validationResult.warnings.map((warn: string, i: number) => (
                      <p key={i}>⚠️ {warn}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* History and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent History */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">📋 最近の生成</h2>
            {history.length > 0 ? (
              <div className="space-y-2">
                {history.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded border border-gray-200 text-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(item.createdAt).toLocaleString("ja-JP")}
                        </p>
                      </div>
                      <Badge variant="outline">{item.type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">履歴がありません</p>
            )}
          </Card>

          {/* Statistics */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">📊 統計</h2>
            {stats ? (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-sm text-gray-600">総生成数</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">タイプ別</p>
                  {Object.entries(stats.byType).map(([type, count]: [string, any]) => (
                    count > 0 && (
                      <div key={type} className="flex justify-between text-xs">
                        <span>{type}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    )
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">言語</p>
                  <div className="flex gap-2">
                    {stats.languages.map((lang: string) => (
                      <Badge key={lang} variant="secondary">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">統計がありません</p>
            )}
          </Card>
        </div>

        {/* Information */}
        <Card className="p-6 bg-blue-50 border border-blue-200">
          <h3 className="font-semibold mb-2">ℹ️ CodeGenerator について</h3>
          <p className="text-sm text-gray-700">
            このコードジェネレータは、テンプレートベースのコード生成エンジンです。
            本物のコードジェネレータには、AIモデル、プログラム解析、テスト、安全性チェックなどが必要ですが、
            ここではその土台となるコード生成エンジンを提供しています。
          </p>
        </Card>
      </div>
    </div>
  );
}
