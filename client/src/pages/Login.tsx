import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("ユーザー名とパスワードを入力してください");
      return;
    }

    setIsLoading(true);
    try {
      await loginMutation.mutateAsync({ username, password });
      toast.success("ログインしました");
      setLocation("/");
    } catch (error: any) {
      toast.error(error.message || "ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !name) {
      toast.error("すべてのフィールドを入力してください");
      return;
    }

    setIsLoading(true);
    try {
      await registerMutation.mutateAsync({
        username,
        password,
        name,
        email: email || null,
      });
      toast.success("登録しました。自動的にログインします");
      setLocation("/");
    } catch (error: any) {
      toast.error(error.message || "登録に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-cyan-200 to-blue-300 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center mb-2">ポイポイ</h1>
          <p className="text-center text-gray-600 mb-6">
            次世代生産管理 & AIクリエイティブプラットフォーム
          </p>

          <form onSubmit={isRegister ? handleRegister : handleLogin}>
            <div className="space-y-4">
              {isRegister && (
                <>
                  <div>
                    <Label htmlFor="name">名前</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="名前"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">メール（オプション）</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="メール"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="username">ユーザー名</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="ユーザー名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "処理中..." : isRegister ? "登録" : "ログイン"}
              </Button>
            </div>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              {isRegister ? "アカウントをお持ちですか？" : "アカウントをお持ちでないですか？"}
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="ml-2 text-blue-600 hover:underline font-semibold"
              >
                {isRegister ? "ログイン" : "無料で登録する"}
              </button>
            </p>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            {isRegister ? "登録することで、" : "ログインすることで、"}
            <a href="#" className="underline">利用規約</a>と
            <a href="#" className="underline">プライバシーポリシー</a>に同意します
          </p>
        </div>
      </Card>
    </div>
  );
}
