import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Copy, Check } from "lucide-react";

interface User {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  isActive: boolean;
}

interface CollaborationPanelProps {
  sessionId: string;
  users: User[];
  onInvite: (sessionId: string) => void;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  sessionId,
  users,
  onInvite,
}) => {
  const [copied, setCopied] = useState(false);

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
  ];

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">コラボレーション</h3>
        </div>
        <Badge variant="secondary">{users.length} 人</Badge>
      </div>

      {/* Session ID */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">セッションID</p>
        <div className="flex gap-2">
          <code className="flex-1 rounded bg-muted p-2 text-xs font-mono">
            {sessionId}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={copySessionId}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                コピー済み
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                コピー
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Users */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">参加者</p>
        <ScrollArea className="h-32 rounded border">
          <div className="space-y-1 p-2">
            {users.map((user, idx) => (
              <div
                key={user.id}
                className="flex items-center gap-2 p-2 rounded hover:bg-muted"
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: colors[idx % colors.length] }}
                />
                <span className="text-sm flex-1">{user.name}</span>
                {user.isActive && (
                  <Badge variant="secondary" className="text-xs">
                    オンライン
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Invite Button */}
      <Button
        onClick={() => onInvite(sessionId)}
        className="w-full"
        variant="outline"
      >
        参加者を招待
      </Button>

      {/* Activity Log */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">最近のアクティビティ</p>
        <ScrollArea className="h-24 rounded border">
          <div className="space-y-1 p-2 text-xs">
            {users.map((user) => (
              <div key={user.id} className="text-muted-foreground">
                <span style={{ color: colors[users.indexOf(user) % colors.length] }}>
                  ●
                </span>{" "}
                {user.name} が参加しました
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
};
