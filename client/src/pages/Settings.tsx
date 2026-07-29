/**
 * Settings Page - Main settings hub
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Wifi, Download, Bell } from 'lucide-react';
import HybridConnectionSettings from '@/components/HybridConnectionSettings';
import ExportSettings from './ExportSettings';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('hybrid');

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">設定</h1>
        </div>
        <p className="text-gray-600">
          PoiPoi の設定を管理します
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hybrid" className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            <span className="hidden sm:inline">接続設定</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">エクスポート</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">通知</span>
          </TabsTrigger>
        </TabsList>

        {/* Hybrid Connection Settings Tab */}
        <TabsContent value="hybrid" className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              🔌 <strong>接続設定</strong>: ローカルサーバーとクラウドサーバーの接続を管理します。
            </p>
          </div>
          <HybridConnectionSettings />
        </TabsContent>

        {/* Export Settings Tab */}
        <TabsContent value="export" className="space-y-4">
          <ExportSettings />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              🔔 <strong>通知設定</strong>: 準備中です
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
