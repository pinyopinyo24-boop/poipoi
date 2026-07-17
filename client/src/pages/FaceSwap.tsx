import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import FaceSwapPage from './FaceSwapPage';

export default function FaceSwap() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-100 to-blue-200">


      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <FaceSwapPage />
      </main>
    </div>
  );
}
