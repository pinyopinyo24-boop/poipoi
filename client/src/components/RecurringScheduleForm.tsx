import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

interface RecurringScheduleFormProps {
  scheduleId: string;
  onSuccess?: () => void;
}

export function RecurringScheduleForm({ scheduleId, onSuccess }: RecurringScheduleFormProps) {
  const { toast } = useToast();
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");
  const [interval, setInterval] = useState(1);
  const [endDate, setEndDate] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);

  const addRecurrence = trpc.scheduleMemory.addRecurrence.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "繰り返しルールを追加しました",
      });
      setFrequency("weekly");
      setInterval(1);
      setEndDate("");
      setDaysOfWeek([]);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addRecurrence.mutate({
      scheduleId,
      frequency,
      interval,
      endDate: endDate || undefined,
      daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : undefined,
    });
  };

  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>繰り返し設定</CardTitle>
        <CardDescription>予定の繰り返しルールを設定します</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="frequency">繰り返し頻度</Label>
            <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">毎日</SelectItem>
                <SelectItem value="weekly">毎週</SelectItem>
                <SelectItem value="monthly">毎月</SelectItem>
                <SelectItem value="yearly">毎年</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">間隔</Label>
            <Input
              id="interval"
              type="number"
              min="1"
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
              placeholder="1"
            />
          </div>

          {frequency === "weekly" && (
            <div className="space-y-2">
              <Label>曜日を選択</Label>
              <div className="flex gap-2">
                {dayLabels.map((label, day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDayOfWeek(day)}
                    className={`w-8 h-8 rounded border text-sm font-medium transition-colors ${
                      daysOfWeek.includes(day)
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="endDate">終了日（オプション）</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={addRecurrence.isPending} className="w-full">
            {addRecurrence.isPending ? "追加中..." : "繰り返しルールを追加"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
