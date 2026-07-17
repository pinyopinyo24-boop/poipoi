import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, AlertCircle, Clock } from "lucide-react";

export interface ProcessingStage {
  name: string;
  status: "pending" | "processing" | "completed" | "error";
  duration?: number;
  error?: string;
}

interface FaceSwapProgressProps {
  isProcessing: boolean;
  stages: ProcessingStage[];
  totalProgress: number; // 0-100
  elapsedTime: number; // milliseconds
  estimatedRemainingTime?: number; // milliseconds
  onCancel?: () => void;
}

export function FaceSwapProgress({
  isProcessing,
  stages,
  totalProgress,
  elapsedTime,
  estimatedRemainingTime,
  onCancel,
}: FaceSwapProgressProps) {
  const [displayTime, setDisplayTime] = useState(elapsedTime);

  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(() => {
      setDisplayTime((prev) => prev + 100);
    }, 100);

    return () => clearInterval(interval);
  }, [isProcessing]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const completedStages = stages.filter((s) => s.status === "completed").length;
  const totalStages = stages.length;
  const stageProgress = (completedStages / totalStages) * 100;

  return (
    <div className="flex flex-col gap-4">
      {/* Overall Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">処理進捗</h3>
          <Badge variant="secondary">{Math.round(totalProgress)}%</Badge>
        </div>
        <Progress value={totalProgress} className="h-2" />
      </Card>

      {/* Processing Stages */}
      <Card className="p-4">
        <h4 className="font-semibold mb-4">処理段階</h4>
        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div key={index} className="flex items-start gap-3">
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-1">
                {stage.status === "completed" && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
                {stage.status === "processing" && (
                  <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                )}
                {stage.status === "pending" && (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
                {stage.status === "error" && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </div>

              {/* Stage Info */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{stage.name}</p>
                  {stage.duration && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(stage.duration)}
                    </span>
                  )}
                </div>
                {stage.error && (
                  <p className="text-xs text-red-600 mt-1">{stage.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Time Information */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600">経過時間</p>
            <p className="text-lg font-semibold text-blue-600">
              {formatTime(displayTime)}
            </p>
          </div>
          {estimatedRemainingTime && isProcessing && (
            <div>
              <p className="text-xs text-gray-600">推定残り時間</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatTime(estimatedRemainingTime)}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Cancel Button */}
      {isProcessing && onCancel && (
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition"
        >
          処理をキャンセル
        </button>
      )}
    </div>
  );
}
