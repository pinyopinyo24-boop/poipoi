import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Play, Pause, StopCircle, TrendingUp } from "lucide-react";

interface TrainingMetrics {
  epoch: number;
  loss: number;
  accuracy: number;
  valLoss: number;
  valAccuracy: number;
}

interface TrainingDashboardProps {
  isTraining: boolean;
  progress: number;
  metrics: TrainingMetrics[];
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
}

export const TrainingDashboard: React.FC<TrainingDashboardProps> = ({
  isTraining,
  progress,
  metrics,
  onStart,
  onPause,
  onStop,
}) => {
  const currentMetrics = metrics[metrics.length - 1];

  return (
    <div className="space-y-4">
      {/* Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">トレーニング進捗</h3>
          </div>
          <Badge variant={isTraining ? "default" : "secondary"}>
            {isTraining ? "実行中" : "停止"}
          </Badge>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>進捗</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {currentMetrics && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded bg-muted p-2">
                <p className="text-muted-foreground text-xs">Loss</p>
                <p className="font-mono font-semibold">
                  {currentMetrics.loss.toFixed(4)}
                </p>
              </div>
              <div className="rounded bg-muted p-2">
                <p className="text-muted-foreground text-xs">精度</p>
                <p className="font-mono font-semibold">
                  {(currentMetrics.accuracy * 100).toFixed(2)}%
                </p>
              </div>
              <div className="rounded bg-muted p-2">
                <p className="text-muted-foreground text-xs">Val Loss</p>
                <p className="font-mono font-semibold">
                  {currentMetrics.valLoss.toFixed(4)}
                </p>
              </div>
              <div className="rounded bg-muted p-2">
                <p className="text-muted-foreground text-xs">Val 精度</p>
                <p className="font-mono font-semibold">
                  {(currentMetrics.valAccuracy * 100).toFixed(2)}%
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          onClick={onStart}
          disabled={isTraining}
          className="flex-1 gap-2"
        >
          <Play className="h-4 w-4" />
          開始
        </Button>
        <Button
          onClick={onPause}
          disabled={!isTraining}
          variant="outline"
          className="flex-1 gap-2"
        >
          <Pause className="h-4 w-4" />
          一時停止
        </Button>
        <Button
          onClick={onStop}
          disabled={!isTraining}
          variant="outline"
          className="flex-1 gap-2"
        >
          <StopCircle className="h-4 w-4" />
          停止
        </Button>
      </div>

      {/* Metrics Chart */}
      {metrics.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold text-sm mb-4">メトリクス推移</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="epoch" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="loss"
                stroke="#ef4444"
                dot={false}
                name="Loss"
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#22c55e"
                dot={false}
                name="精度"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Epoch Info */}
      {currentMetrics && (
        <Card className="p-4">
          <h4 className="font-semibold text-sm mb-2">エポック情報</h4>
          <div className="text-sm space-y-1 text-muted-foreground">
            <p>現在のエポック: <span className="font-mono font-semibold text-foreground">{currentMetrics.epoch}</span></p>
            <p>推定完了時間: <span className="font-mono font-semibold text-foreground">約 {Math.ceil((100 - progress) / 5)} 分</span></p>
          </div>
        </Card>
      )}
    </div>
  );
};
