import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Spinner } from './ui/spinner';
import VideoFrameExtractor, { ExtractedFrame } from '../lib/videoFrameExtractor';

interface VideoFaceDetectionPreviewProps {
  videoBase64: string;
  onFrameSelected: (frameBase64: string, timestamp: number) => void;
  label?: string;
}

export const VideoFaceDetectionPreview: React.FC<
  VideoFaceDetectionPreviewProps
> = ({ videoBase64, onFrameSelected, label = 'Video Preview' }) => {
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<{
    duration: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const extractFrames = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Convert base64 to Blob
        const binaryString = atob(videoBase64.split(',')[1]);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const videoBlob = new Blob([bytes], { type: 'video/mp4' });

        const extractor = new VideoFrameExtractor();

        // Get metadata
        const metadata = await extractor.getVideoMetadata(videoBlob);
        setVideoMetadata(metadata);

        // Extract frames
        const extractedFrames = await extractor.extractFrames(videoBlob, 500, 10);
        setFrames(extractedFrames);
        setSelectedFrameIndex(0);

        if (extractedFrames.length > 0) {
          onFrameSelected(extractedFrames[0].imageData, extractedFrames[0].timestamp);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to extract video frames'
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (videoBase64) {
      extractFrames();
    }
  }, [videoBase64, onFrameSelected]);

  const handleFrameSelect = (index: number) => {
    setSelectedFrameIndex(index);
    if (frames[index]) {
      onFrameSelected(frames[index].imageData, frames[index].timestamp);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4 bg-blue-50">
        <div className="flex items-center justify-center gap-2">
          <Spinner />
          <span>動画フレームを抽出中...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 bg-red-50 border-red-200">
        <div className="text-red-700">
          <p className="font-semibold">フレーム抽出エラー</p>
          <p className="text-sm">{error}</p>
        </div>
      </Card>
    );
  }

  if (frames.length === 0) {
    return (
      <Card className="p-4 bg-gray-50">
        <p className="text-gray-600">フレームが抽出されませんでした</p>
      </Card>
    );
  }

  const selectedFrame = frames[selectedFrameIndex];

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold mb-2">{label}</h3>
        {videoMetadata && (
          <p className="text-sm text-gray-600">
            動画: {videoMetadata.duration.toFixed(1)}秒 ({videoMetadata.width}x
            {videoMetadata.height})
          </p>
        )}
      </div>

      {/* Selected Frame Display */}
      <div className="bg-gray-100 rounded-lg overflow-hidden">
        <img
          src={selectedFrame.imageData}
          alt={`Frame at ${selectedFrame.timestamp.toFixed(2)}s`}
          className="w-full h-auto"
        />
        <p className="text-center text-sm text-gray-600 py-2">
          フレーム: {selectedFrame.timestamp.toFixed(2)}秒
        </p>
      </div>

      {/* Frame Thumbnails */}
      <div>
        <p className="text-sm font-medium mb-2">フレーム選択:</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {frames.map((frame, index) => (
            <Button
              key={index}
              variant={selectedFrameIndex === index ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFrameSelect(index)}
              className="flex-shrink-0"
            >
              <img
                src={frame.imageData}
                alt={`Thumbnail ${index}`}
                className="w-12 h-12 object-cover rounded"
              />
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default VideoFaceDetectionPreview;
