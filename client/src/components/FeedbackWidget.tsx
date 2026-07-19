import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"bug" | "feature" | "suggestion" | "other">("suggestion");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const submitFeedback = trpc.feedback.submit.useMutation();

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "エラー",
        description: "タイトルとメッセージを入力してください",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFeedback.mutateAsync({
        type: feedbackType,
        title,
        message,
        email: email || undefined,
      });

      toast({
        title: "送信完了",
        description: "フィードバックをお送りいただきありがとうございます",
      });

      // Reset form
      setTitle("");
      setMessage("");
      setEmail("");
      setFeedbackType("suggestion");
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "エラー",
        description: "フィードバックの送信に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button - Top right corner, out of the way */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-6 right-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-lg transition-all hover:shadow-xl z-30"
        aria-label="フィードバック"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Feedback Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] z-50">
          <DialogHeader>
            <DialogTitle>フィードバック送信</DialogTitle>
            <DialogDescription>
              ご意見やご提案をお聞かせください。プロダクト改善に活用させていただきます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Feedback Type */}
            <div>
              <label className="block text-sm font-medium mb-2">フィードバックの種類</label>
              <Select value={feedbackType} onValueChange={(value: any) => setFeedbackType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">バグ報告</SelectItem>
                  <SelectItem value="feature">機能リクエスト</SelectItem>
                  <SelectItem value="suggestion">改善提案</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">タイトル</label>
              <Input
                placeholder="フィードバックのタイトルを入力"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium mb-2">詳細</label>
              <Textarea
                placeholder="詳しい内容をお聞かせください..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </div>

            {/* Email (Optional) */}
            <div>
              <label className="block text-sm font-medium mb-2">メールアドレス（オプション）</label>
              <Input
                type="email"
                placeholder="返信が必要な場合はメールアドレスを入力"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    送信中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    送信
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
