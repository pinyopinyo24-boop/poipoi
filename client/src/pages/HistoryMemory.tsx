import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HistoryPanel } from '@/components/HistoryPanel';
import { MemoryPanel } from '@/components/MemoryPanel';
import { Clock, Brain } from 'lucide-react';

export default function HistoryMemory() {
  const [activeTab, setActiveTab] = useState('history');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">ポイポイ - 履歴と記憶</h1>
          <p className="text-gray-600">あなたの作業履歴と長期記憶を管理します</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="history" className="gap-2">
              <Clock className="w-4 h-4" />
              履歴
            </TabsTrigger>
            <TabsTrigger value="memory" className="gap-2">
              <Brain className="w-4 h-4" />
              長期記憶
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <HistoryPanel />
            </div>
          </TabsContent>

          <TabsContent value="memory" className="mt-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <MemoryPanel />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
