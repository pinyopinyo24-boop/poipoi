import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(() => {
    const errors: Record<string, string> = {
      not_configured: "Google登録は接続設定待ちです。従来の登録・ログインも利用できます。",
      state: "認証の有効期限が切れたか、開始したブラウザーと異なります。Googleログインをやり直してください。",
      cancelled: "Googleでの認証がキャンセルされました。",
      verification: "Googleの認証を確認できませんでした。やり直してください。",
      storage: "アカウント保存用のデータベースに接続できません。",
      failed: "Googleでの登録・ログインに失敗しました。Google接続設定・通信・データベースの確認が必要です。",
    };
    const key = new URLSearchParams(window.location.search).get("google_error");
    return key ? errors[key] || "Google認証に失敗しました。" : "";
  });
  const [googleStatus, setGoogleStatus] = useState<"loading" | "enabled" | "disabled" | "error">("loading");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/oauth/google/status", { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Status unavailable");
        const data: unknown = await response.json();
        if (!controller.signal.aborted) setGoogleStatus(data && typeof data === "object" && "enabled" in data && data.enabled === true ? "enabled" : "disabled");
      })
      .catch(() => { if (!controller.signal.aborted) setGoogleStatus("error"); });
    return () => controller.abort();
  }, []);
  const [notice, setNotice] = useState("");
  const showError = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback;
    if (message.includes("Database not available")) {
      setErrorMessage("アカウント保存用のデータベースに接続できません。PC側のデータベース設定を確認する必要があります。");
      return;
    }
    try {
      const issues: unknown = JSON.parse(message);
      if (Array.isArray(issues)) {
        setErrorMessage(issues.map(issue => typeof issue?.message === "string" ? issue.message : fallback).join("／"));
        return;
      }
    } catch { /* The server may return a plain-language error. */ }
    setErrorMessage(message || fallback);
  };

  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMessage(""); setNotice("");
    if (!username || !password) {
      setErrorMessage("ユーザー名とパスワードを入力してください");
      return;
    }

    setIsLoading(true);
    try {
      await loginMutation.mutateAsync({ username, password });
      setNotice("ログインしました");
      await utils.auth.me.invalidate();
      setLocation("/streaming");
    } catch (error: unknown) {
      setNotice("");
      showError(error, "ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMessage(""); setNotice("");
    if (!username || !password || !name) {
      setErrorMessage("名前・ユーザー名・パスワードを入力してください。メールは空欄で構いません。");
      return;
    }

    setIsLoading(true);
    try {
      await registerMutation.mutateAsync({
        username,
        password,
        name,
        email: email.trim() || null,
      });
      setNotice("登録しました。ログイン状態を確認しています。");
      await utils.auth.me.invalidate();
      setLocation("/streaming");
    } catch (error: unknown) {
      setNotice("");
      showError(error, "登録に失敗しました");
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

          <div className="mb-5 space-y-2">
            <Button type="button" variant="outline" className="w-full" disabled={isLoading || googleStatus !== "enabled"}
              onClick={() => window.location.assign("/api/oauth/google/start")}>
              Googleアカウントで{isRegister ? "登録" : "ログイン"}
            </Button>
            {googleStatus === "loading" && <p className="text-xs text-gray-600">Google接続設定を確認中...</p>}
            {googleStatus === "disabled" && <p className="text-xs text-gray-600">Google登録は接続設定待ちです。下の通常登録・ログインも利用できます。</p>}
            {googleStatus === "error" && <p role="status" className="text-xs text-red-700">Google接続設定を確認できません。下の通常登録・ログインをお使いください。</p>}
            <p className="text-center text-xs text-gray-500">またはユーザー名とパスワードで続ける</p>
          </div>
          <form onSubmit={isRegister ? handleRegister : handleLogin}>
            <div className="space-y-4">
              {isRegister && (
                <>
                  <div>
                    <Label htmlFor="name">名前</Label>
                    <Input
                      id="name"
                      name="name"
                      autoComplete="name"
                      required
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
                      name="email"
                      autoComplete="email"
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
                  name="username"
                  autoComplete="username"
                  required
                  minLength={3}
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
                  name="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  type="password"
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <p className="text-xs text-gray-600">ユーザー名は3文字以上、パスワードは6文字以上です。</p>
              {errorMessage && <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">{errorMessage}</p>}
              {notice && <p role="status" className="text-sm text-blue-700">{notice}</p>}
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
                disabled={isLoading}
                onClick={() => { setIsRegister(!isRegister); setErrorMessage(""); setNotice(""); }}
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
