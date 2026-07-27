import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

export function NotificationSettings() {
  const { toast } = useToast();
  const [deviceId, setDeviceId] = useState("");
  const [fcmToken, setFcmToken] = useState("");

  const getNotificationHistory = trpc.scheduleMemory.getNotificationHistory.useQuery({ limit: 20 });
  const registerDevice = trpc.scheduleMemory.registerAndroidDevice.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "デバイスを登録しました",
      });
      setDeviceId("");
      setFcmToken("");
      getNotificationHistory.refetch();
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRegisterDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId || !fcmToken) {
      toast({
        title: "エラー",
        description: "デバイスIDと FCM トークンを入力してください",
        variant: "destructive",
      });
      return;
    }
    registerDevice.mutate({
      deviceId,
      fcmToken,
      platform: "android",
    });
  };

  return (
    <div className="space-y-6">
      {/* Register Device */}
      <Card>
        <CardHeader>
          <CardTitle>デバイス登録</CardTitle>
          <CardDescription>Android デバイスを登録して通知を受け取ります</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegisterDevice} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deviceId">デバイスID</Label>
              <Input
                id="deviceId"
                placeholder="e.g., device-12345"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fcmToken">FCM トークン</Label>
              <Input
                id="fcmToken"
                placeholder="Firebase Cloud Messaging トークン"
                value={fcmToken}
                onChange={(e) => setFcmToken(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <Button type="submit" disabled={registerDevice.isPending} className="w-full">
              {registerDevice.isPending ? "登録中..." : "デバイスを登録"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notification History */}
      {getNotificationHistory.data && getNotificationHistory.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>通知履歴</CardTitle>
            <CardDescription>最近の通知</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getNotificationHistory.data.map((notification: any, idx: number) => (
                <div key={idx} className="border rounded p-3 text-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{notification.type || "通知"}</p>
                      <p className="text-gray-600 text-xs">{notification.message}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      notification.status === "sent"
                        ? "bg-green-100 text-green-800"
                        : notification.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {notification.status || "pending"}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    {new Date(notification.createdAt).toLocaleString("ja-JP")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
