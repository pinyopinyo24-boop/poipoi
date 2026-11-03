import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ConnectionPreference = "local" | "chatgpt";

/** Stores a connection preference; it does not claim OAuth is connected. */
export default function HomeAISettings() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ConnectionPreference>("local");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const storageKey = "poipoi_ai_connection_preference_v1:" + String(user?.id ?? "guest");

  useEffect(() => {
    setFeedback("");
    setError("");
    try {
      const saved = localStorage.getItem(storageKey);
      setSelected(saved === "chatgpt" ? "chatgpt" : "local");
    } catch {
      setSelected("local");
      setError("保存した選択を読み込めませんでした。");
    }
  }, [storageKey]);

  const choose = (value: string) => {
    if (value !== "local" && value !== "chatgpt") return;
    try {
      localStorage.setItem(storageKey, value);
      setSelected(value);
      setError("");
      setFeedback("選択をこのブラウザーに保存しました。");
    } catch {
      setFeedback("");
      setError("選択を保存できませんでした。");
    }
  };

  return <>
    <Button type="button" variant="outline"
      className="h-10 w-10 shrink-0 p-0"
      aria-label="設定" aria-haspopup="dialog" title="設定・AIの切り替え"
      onClick={() => setOpen(true)}>
      <Settings className="h-5 w-5" aria-hidden="true" />
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>設定</DialogTitle>
          <DialogDescription>AIの接続先を選択して保存できます。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label htmlFor="home-ai-connection" className="block text-sm font-semibold">AIの切り替え</label>
          <select id="home-ai-connection" value={selected}
            onChange={event => choose(event.target.value)}
            aria-describedby="home-ai-connection-status"
            className="w-full rounded-md border border-gray-300 bg-white p-3 text-gray-900">
            <option value="local">ローカルAI</option>
            <option value="chatgpt">ChatGPT（連携未設定）</option>
          </select>
          <div id="home-ai-connection-status" className="space-y-2 rounded-lg bg-cyan-50 p-3 text-sm text-gray-700">
            <p>選択した接続先：{selected === "local" ? "ローカルAI" : "ChatGPT（未接続）"}</p>
            <p>ChatGPT連携は準備中です。選択は保存されますが、接続・認証が完了するまでChatGPTへは切り替わりません。</p>
            <p>無料・Plusなどの利用枠とモデルの利用可否は、ChatGPTとの連携後に確認します。</p>
          </div>
          {feedback && <p role="status" className="text-sm text-green-700">{feedback}</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
