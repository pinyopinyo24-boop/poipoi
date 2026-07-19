import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Slider } from '@/components/ui/slider';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function FaceFusionV3Page() {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Settings state
  const [faceMaskType, setFaceMaskType] = useState<'region' | 'box'>('region');
  const [faceMaskAreas, setFaceMaskAreas] = useState(0.7);
  const [faceMaskPaddingTop, setFaceMaskPaddingTop] = useState(0);
  const [faceMaskPaddingBottom, setFaceMaskPaddingBottom] = useState(0);
  const [faceMaskPaddingLeft, setFaceMaskPaddingLeft] = useState(0);
  const [faceMaskPaddingRight, setFaceMaskPaddingRight] = useState(0);
  const [faceSwapperModel, setFaceSwapperModel] = useState<'inswapper_128' | 'simswap_256'>('inswapper_128');
  const [videoQuality, setVideoQuality] = useState(18);

  const sourceInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);

  // Check installation
  const { data: status } = trpc.facefusionV3.getStatus.useQuery();

  // Mutations
  const swapVideoMutation = trpc.facefusionV3.swapVideoFaceSwap.useMutation();
  const swapImageMutation = trpc.facefusionV3.swapImageFaceSwap.useMutation();

  const handleSourceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSourceFile(file);
    }
  };

  const handleTargetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTargetFile(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const handleProcess = async () => {
    if (!sourceFile || !targetFile) {
      toast.error('Please select both source and target files');
      return;
    }

    try {
      setProcessing(true);
      setProgress(0);

      const sourceBase64 = await fileToBase64(sourceFile);
      const targetBase64 = await fileToBase64(targetFile);

      const isVideo = targetFile.type.startsWith('video/');

      if (isVideo) {
        setProgress(25);
        const result = await swapVideoMutation.mutateAsync({
          sourceBase64,
          targetBase64,
          faceMaskType,
          faceMaskAreas,
          faceSwapperModel,
          videoQuality,
        });

        if (result.success && result.resultBase64) {
          setProgress(100);
          const binaryString = atob(result.resultBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const url = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
          setResultUrl(url);
          toast.success('Video face swap completed!');
        } else {
          toast.error(result.message);
        }
      } else {
        setProgress(25);
        const result = await swapImageMutation.mutateAsync({
          sourceBase64,
          targetBase64,
          faceMaskType,
          faceMaskAreas,
          faceSwapperModel,
        });

        if (result.success && result.resultBase64) {
          setProgress(100);
          const binaryString = atob(result.resultBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
          setResultUrl(url);
          toast.success('Image face swap completed!');
        } else {
          toast.error(result.message);
        }
      }
    } catch (error) {
      toast.error(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };


  const handleDownload = () => {
    if (!resultUrl) return;

    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = `face-swap-result-${Date.now()}${targetFile?.type.startsWith('video/') ? '.mp4' : '.jpg'}`;
    link.click();
  };

  if (!status?.ready) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-4">FaceFusion v3.6.1</h1>
          <p className="text-gray-600 mb-6">
            {status?.installed ? 'FaceFusion is installed but models are missing.' : 'FaceFusion is not installed.'}
          </p>
          <Button
            disabled={true}
            size="lg"
          >
            FaceFusion is ready
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">Upload Files</h2>

          {/* Source Image */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Source Face Image</label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400"
              onClick={() => sourceInputRef.current?.click()}
            >
              {sourceFile ? (
                <div>
                  <p className="font-medium">{sourceFile.name}</p>
                  <p className="text-sm text-gray-600">{(sourceFile.size / 1024).toFixed(2)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Click to upload source image</p>
                  <p className="text-sm text-gray-600">JPG, PNG (clear face recommended)</p>
                </div>
              )}
            </div>
            <input
              ref={sourceInputRef}
              type="file"
              accept="image/*"
              onChange={handleSourceFileChange}
              className="hidden"
            />
          </div>

          {/* Target Image/Video */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Target Image or Video</label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400"
              onClick={() => targetInputRef.current?.click()}
            >
              {targetFile ? (
                <div>
                  <p className="font-medium">{targetFile.name}</p>
                  <p className="text-sm text-gray-600">{(targetFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Click to upload target</p>
                  <p className="text-sm text-gray-600">JPG, PNG, MP4, MOV</p>
                </div>
              )}
            </div>
            <input
              ref={targetInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleTargetFileChange}
              className="hidden"
            />
          </div>
        </Card>

        {/* Settings Section */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">Settings</h2>

          {/* Face Mask Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Face Mask Type</label>
            <select
              value={faceMaskType}
              onChange={(e) => setFaceMaskType(e.target.value as 'region' | 'box')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="region">Region (Recommended)</option>
              <option value="box">Box</option>
            </select>
          </div>

          {/* Face Mask Areas */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Face Mask Areas: {faceMaskAreas.toFixed(2)}
            </label>
            <Slider
              value={[faceMaskAreas]}
              onValueChange={(value) => setFaceMaskAreas(value[0])}
              min={0}
              max={1}
              step={0.1}
            />
            <p className="text-xs text-gray-600 mt-1">
              0.5-0.7 recommended for natural results
            </p>
          </div>

          {/* Face Swapper Model */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Face Swapper Model</label>
            <select
              value={faceSwapperModel}
              onChange={(e) => setFaceSwapperModel(e.target.value as 'inswapper_128' | 'simswap_256')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="inswapper_128">inswapper_128 (High Quality)</option>
              <option value="simswap">simswap (Fast)</option>
            </select>
          </div>

          {/* Video Quality */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Video Quality: {videoQuality}
            </label>
            <Slider
              value={[videoQuality]}
              onValueChange={(value) => setVideoQuality(value[0])}
              min={0}
              max={51}
              step={1}
            />
            <p className="text-xs text-gray-600 mt-1">
              Lower is better quality (18 recommended)
            </p>
          </div>

          {/* Padding Controls */}
          <div className="mb-6 p-4 bg-gray-50 rounded">
            <p className="text-sm font-medium mb-3">Face Mask Padding</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block">Top: {faceMaskPaddingTop}</label>
                <Slider
                  value={[faceMaskPaddingTop]}
                  onValueChange={(value) => setFaceMaskPaddingTop(value[0])}
                  min={-50}
                  max={50}
                  step={1}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Bottom: {faceMaskPaddingBottom}</label>
                <Slider
                  value={[faceMaskPaddingBottom]}
                  onValueChange={(value) => setFaceMaskPaddingBottom(value[0])}
                  min={-50}
                  max={50}
                  step={1}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Left: {faceMaskPaddingLeft}</label>
                <Slider
                  value={[faceMaskPaddingLeft]}
                  onValueChange={(value) => setFaceMaskPaddingLeft(value[0])}
                  min={-50}
                  max={50}
                  step={1}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Right: {faceMaskPaddingRight}</label>
                <Slider
                  value={[faceMaskPaddingRight]}
                  onValueChange={(value) => setFaceMaskPaddingRight(value[0])}
                  min={-50}
                  max={50}
                  step={1}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Process Button */}
      <div className="mt-8 flex gap-4">
        <Button
          onClick={handleProcess}
          disabled={!sourceFile || !targetFile || processing}
          size="lg"
          className="flex-1"
        >
          {processing ? (
            <>
              <Spinner className="mr-2" />
              Processing... {progress}%
            </>
          ) : (
            'Start Face Swap'
          )}
        </Button>
      </div>

      {/* Result Section */}
      {resultUrl && (
        <Card className="mt-8 p-6">
          <h2 className="text-2xl font-bold mb-4">Result</h2>
          <div className="mb-4">
            {targetFile?.type.startsWith('video/') ? (
              <video
                src={resultUrl}
                controls
                className="w-full rounded-lg"
                style={{ maxHeight: '500px' }}
              />
            ) : (
              <img
                src={resultUrl}
                alt="Result"
                className="w-full rounded-lg"
                style={{ maxHeight: '500px' }}
              />
            )}
          </div>
          <Button onClick={handleDownload} size="lg" className="w-full">
            Download Result
          </Button>
        </Card>
      )}
    </div>
  );
}
