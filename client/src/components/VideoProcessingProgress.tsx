import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Spinner } from './ui/spinner';
import { Progress } from './ui/progress';
import { AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';

interface VideoProcessingProgressProps {
  totalFrames: number;
  processedFrames: number;
  status: 'extracting' | 'detecting' | 'processing' | 'reconstructing' | 'complete' | 'error';
  estimatedTimeRemaining: number;
  error?: string;
  onCancel?: () => void;
}

export const VideoProcessingProgress: React.FC<VideoProcessingProgressProps> = ({
  totalFrames,
  processedFrames,
  status,
  estimatedTimeRemaining,
  error,
  onCancel,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTime = Date.now();

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.round((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const progress = totalFrames > 0 ? (processedFrames / totalFrames) * 100 : 0;

  const statusMessages = {
    extracting: '動画フレームを抽出中...',
    detecting: '顔を検出中...',
    processing: '顔入れ替え処理中...',
    reconstructing: '動画を再構成中...',
    complete: '処理完了',
    error: 'エラーが発生しました',
  };

  const statusColors = {
    extracting: 'bg-blue-50 border-blue-200',
    detecting: 'bg-purple-50 border-purple-200',
    processing: 'bg-orange-50 border-orange-200',
    reconstructing: 'bg-green-50 border-green-200',
    complete: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}時間 ${minutes}分 ${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分 ${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  return (
    <Card className={`p-6 border-2 ${statusColors[status]}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status === 'complete' ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : status === 'error' ? (
              <AlertCircle className="w-6 h-6 text-red-600" />
            ) : (
              <Spinner className="w-6 h-6" />
            )}
            <h3 className="text-lg font-semibold">{statusMessages[status]}</h3>
          </div>
          {(status !== 'complete' && status !== 'error') && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={false}
            >
              キャンセル
            </Button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Progress Bar */}
        {(status !== 'complete' && status !== 'error') && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                フレーム: {processedFrames} / {totalFrames}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Time Information */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-gray-600">経過時間</span>
            </div>
            <p className="text-sm font-semibold">{formatTime(elapsedTime)}</p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-medium text-gray-600">推定残り時間</span>
            </div>
            <p className="text-sm font-semibold">
              {estimatedTimeRemaining > 0
                ? formatTime(Math.round(estimatedTimeRemaining / 1000))
                : '計算中...'}
            </p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-gray-600">フレーム/秒</span>
            </div>
            <p className="text-sm font-semibold">
              {elapsedTime > 0
                ? (processedFrames / elapsedTime).toFixed(1)
                : '0.0'}
            </p>
          </div>
        </div>

        {/* Status Details */}
        <div className="text-xs text-gray-600 space-y-1">
          <p>• 処理状態: {statusMessages[status]}</p>
          <p>• 処理済みフレーム: {processedFrames} / {totalFrames}</p>
          {estimatedTimeRemaining > 0 && (
            <p>
              • 推定完了時刻:{' '}
              {new Date(Date.now() + estimatedTimeRemaining).toLocaleTimeString('ja-JP')}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default VideoProcessingProgress;
