import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, X } from "lucide-react";

interface StreamingDisplayProps {
  isStreaming: boolean;
  content: string;
  tokens: number;
  tokensPerSecond: number;
  onCancel: () => void;
  error?: string;
}

export const StreamingDisplay: React.FC<StreamingDisplayProps> = ({
  isStreaming,
  content,
  tokens,
  tokensPerSecond,
  onCancel,
  error,
}) => {
  const [displayedContent, setDisplayedContent] = useState("");

  useEffect(() => {
    if (content.length > displayedContent.length) {
      const timer = setTimeout(() => {
        setDisplayedContent(content.substring(0, displayedContent.length + 1));
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [content, displayedContent]);

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <div className="rounded-lg bg-muted p-4">
        <div className="whitespace-pre-wrap break-words text-sm">
          {displayedContent}
          {isStreaming && <span className="animate-pulse">▌</span>}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex gap-4">
          <span>トークン: {tokens}</span>
          <span>速度: {tokensPerSecond.toFixed(1)} tokens/s</span>
        </div>
        {isStreaming && (
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="gap-2"
          >
            <X className="h-3 w-3" />
            キャンセル
          </Button>
        )}
      </div>

      {isStreaming && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner className="h-3 w-3" />
          生成中...
        </div>
      )}
    </div>
  );
};
