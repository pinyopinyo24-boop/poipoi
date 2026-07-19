/**
 * Face Swap HQ Page
 * 高品質顔入れ替え動画生成ページ
 */

import React from 'react';
import { FaceSwapUI } from '@/components/FaceSwapUI';

export default function FaceSwapHQPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🎬 高品質顔入れ替え動画生成</h1>
          <p className="text-gray-600">Facefusionを使った最高品質の顔入れ替え動画を生成します</p>
        </div>

        <FaceSwapUI
          onComplete={(result) => {
            console.log('Face swap completed:', result);
          }}
        />
      </div>
    </div>
  );
}
