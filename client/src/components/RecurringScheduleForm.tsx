import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

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
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editFrequency, setEditFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");
  const [editInterval, setEditInterval] = useState(1);
  const recurrenceRules = trpc.scheduleMemory.getRecurrences.useQuery();
  const updateRecurrence = trpc.scheduleMemory.updateRecurrence.useMutation({
    onSuccess: () => {
      setEditingRuleId(null);
      recurrenceRules.refetch();
    },
    onError: (error: any) => toast({ title: "エラー", description: error.message, variant: "destructive" }),
  });
  const deleteRecurrence = trpc.scheduleMemory.deleteRecurrence.useMutation({
    onSuccess: () => recurrenceRules.refetch(),
    onError: (error: any) => toast({ title: "エラー", description: error.message, variant: "destructive" }),
  });

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
      recurrenceRules.refetch();
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
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold">登録済みのルール</h3>
          {(recurrenceRules.data ?? [])
            .filter((rule: any) => rule.scheduleId === scheduleId && rule.isActive)
            .map((rule: any) => (
              <div key={rule.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm">
                {editingRuleId === rule.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={editFrequency} onValueChange={(value: any) => setEditFrequency(value)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">毎日</SelectItem>
                        <SelectItem value="weekly">毎週</SelectItem>
                        <SelectItem value="monthly">毎月</SelectItem>
                        <SelectItem value="yearly">毎年</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" min="1" className="w-20" value={editInterval} onChange={(event) => setEditInterval(Math.max(1, Number(event.target.value) || 1))} />
                    <Button type="button" size="sm" disabled={updateRecurrence.isPending} onClick={() => updateRecurrence.mutate({ id: rule.id, frequency: editFrequency, interval: editInterval })}>保存</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingRuleId(null)}>取消</Button>
                  </div>
                ) : (
                  <>
                    <span>
                      {rule.frequency === "daily" ? "毎日" : rule.frequency === "weekly" ? "毎週" : rule.frequency === "monthly" ? "毎月" : "毎年"}
                      {rule.interval > 1 ? `（${rule.interval}間隔）` : ""}
                      {rule.endDate ? ` ・終了 ${new Date(rule.endDate).toLocaleDateString("ja-JP")}` : " ・終了日なし"}
                    </span>
                    <div className="flex items-center">
                      <Button type="button" variant="ghost" size="sm" onClick={() => {
                        setEditingRuleId(rule.id);
                        setEditFrequency(rule.frequency);
                        setEditInterval(rule.interval);
                      }}>編集</Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="繰り返しルールを削除"
                        disabled={deleteRecurrence.isPending}
                        onClick={() => deleteRecurrence.mutate({ id: rule.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          {!recurrenceRules.isLoading && !(recurrenceRules.data ?? []).some((rule: any) => rule.scheduleId === scheduleId && rule.isActive) && (
            <p className="text-sm text-gray-500">繰り返しルールはありません</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
