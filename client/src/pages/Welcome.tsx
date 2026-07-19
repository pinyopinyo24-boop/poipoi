/**
 * Welcome/Onboarding Screen
 * 初回起動時の初期設定フロー
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, ArrowRight, Settings, Shield, Zap } from 'lucide-react';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface UserSettings {
  userName: string;
  defaultProvider: string;
  language: string;
  notifications: boolean;
  analytics: boolean;
}

export default function Welcome() {
  const [currentStep, setCurrentStep] = useState(0);
  const [settings, setSettings] = useState<UserSettings>({
    userName: '',
    defaultProvider: 'openai',
    language: 'ja',
    notifications: true,
    analytics: true,
  });
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([false, false, false, false]);

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: 'ようこそ PoiPoi へ',
      description: 'PoiPoi は次世代の生産管理 & AI クリエイティブプラットフォームです',
      icon: <Zap className="w-12 h-12 text-blue-600" />,
      completed: completedSteps[0],
    },
    {
      id: 2,
      title: 'ユーザー情報設定',
      description: 'お名前と基本設定を入力してください',
      icon: <Settings className="w-12 h-12 text-blue-600" />,
      completed: completedSteps[1],
    },
    {
      id: 3,
      title: 'AI プロバイダー選択',
      description: 'デフォルトで使用する AI プロバイダーを選択してください',
      icon: <Zap className="w-12 h-12 text-blue-600" />,
      completed: completedSteps[2],
    },
    {
      id: 4,
      title: '利用規約と設定',
      description: 'プライバシーとセキュリティ設定を確認してください',
      icon: <Shield className="w-12 h-12 text-blue-600" />,
      completed: completedSteps[3],
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const newCompleted = [...completedSteps];
      newCompleted[currentStep] = true;
      setCompletedSteps(newCompleted);
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = () => {
    // Save settings and mark onboarding as complete
    localStorage.setItem('poipoi_user_settings', JSON.stringify(settings));
    localStorage.setItem('poipoi_onboarding_complete', 'true');
    window.location.href = '/beta-chat';
  };

  const handleSettingChange = (key: keyof UserSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex-1 h-2 mx-1 rounded-full transition-colors ${
                  index < currentStep
                    ? 'bg-blue-600'
                    : index === currentStep
                    ? 'bg-blue-400'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            ステップ {currentStep + 1} / {steps.length}
          </p>
        </div>

        {/* Main Content */}
        <Card className="p-8 shadow-lg">
          {currentStep === 0 && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">{steps[0].icon}</div>
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  ようこそ PoiPoi へ
                </h1>
                <p className="text-lg text-muted-foreground">
                  次世代の生産管理 & AI クリエイティブプラットフォーム
                </p>
              </div>
              <div className="space-y-3 text-left bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>高速・高機能な AI 駆動プラットフォーム</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>複数の AI プロバイダーに対応</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>生産管理・原価管理・在庫管理を統合</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>ファイル処理と AI 分析を自動化</span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  ユーザー情報設定
                </h2>
                <p className="text-muted-foreground">
                  お名前と基本設定を入力してください
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    お名前
                  </label>
                  <Input
                    placeholder="山田太郎"
                    value={settings.userName}
                    onChange={e => handleSettingChange('userName', e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    言語
                  </label>
                  <Select value={settings.language} onValueChange={value => handleSettingChange('language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ja">日本語</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <label className="text-sm font-semibold text-foreground">
                    通知を有効にする
                  </label>
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={e => handleSettingChange('notifications', e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <label className="text-sm font-semibold text-foreground">
                    分析データを共有
                  </label>
                  <input
                    type="checkbox"
                    checked={settings.analytics}
                    onChange={e => handleSettingChange('analytics', e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  AI プロバイダー選択
                </h2>
                <p className="text-muted-foreground">
                  デフォルトで使用する AI プロバイダーを選択してください
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'openai', name: 'OpenAI GPT-4', desc: '高精度・高機能' },
                  { id: 'claude', name: 'Claude 3 Opus', desc: '長文対応・分析力' },
                  { id: 'gemini', name: 'Google Gemini', desc: '高速・多機能' },
                  { id: 'local', name: 'ローカル AI', desc: 'プライベート・オフライン' },
                ].map(provider => (
                  <div
                    key={provider.id}
                    onClick={() => handleSettingChange('defaultProvider', provider.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      settings.defaultProvider === provider.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{provider.name}</p>
                        <p className="text-sm text-muted-foreground">{provider.desc}</p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          settings.defaultProvider === provider.id
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {settings.defaultProvider === provider.id && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  利用規約とセキュリティ
                </h2>
                <p className="text-muted-foreground">
                  プライバシーとセキュリティ設定を確認してください
                </p>
              </div>

              <div className="space-y-4 bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">利用規約</h3>
                  <p className="text-sm text-muted-foreground">
                    PoiPoi を使用することにより、以下の条件に同意するものとします：
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                    <li>本サービスは「現状のまま」提供されます</li>
                    <li>ユーザーデータは安全に保護されます</li>
                    <li>不正な使用は禁止されています</li>
                    <li>利用規約は予告なく変更される可能性があります</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">プライバシー</h3>
                  <p className="text-sm text-muted-foreground">
                    あなたのデータは以下の方法で保護されます：
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                    <li>HTTPS による暗号化通信</li>
                    <li>AES-256 による暗号化保存</li>
                    <li>定期的なセキュリティ監査</li>
                    <li>第三者との共有なし</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="agree"
                  className="w-4 h-4"
                  defaultChecked
                />
                <label htmlFor="agree" className="text-sm text-foreground">
                  利用規約とプライバシーポリシーに同意します
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex-1"
            >
              戻る
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  開始する
                  <CheckCircle2 className="w-4 h-4" />
                </>
              ) : (
                <>
                  次へ
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-blue-600'
                    : index < currentStep
                    ? 'bg-green-600'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>PoiPoi Beta v0.1.0</p>
          <p>© 2026 PoiPoi Development Team</p>
        </div>
      </div>
    </div>
  );
}
