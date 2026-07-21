# STEP103 テスト実行計画

## テスト目的

AI Agent基盤の実動作確認を実施し、以下を検証する：

1. Gemini Real Mode 接続確認
2. ChatGPT Real Mode 接続確認
3. Agent Workflow 実行確認
4. ExecutionLogger 記録確認

## テスト環境

- **環境:** Manus Sandbox (開発環境)
- **ビルド状態:** ✅ npm run check: 0 errors
- **ビルド状態:** ✅ npm run build: 506.7 KB
- **Dev Server:** ✅ Running on port 3000

## テスト1: Gemini Real Mode テスト

### 前提条件
- GEMINI_API_KEY が設定されていること
- または Demo Mode で動作確認

### テスト手順

```bash
# 1. Dashboard にアクセス
curl http://localhost:3000/dashboard

# 2. 「こんにちは」を送信
# 3. Gemini API へのリクエスト確認
# 4. ExecutionLogger に記録確認
```

### 期待結果

- ✅ Gemini Provider が Real Mode で初期化
- ✅ API リクエスト送信
- ✅ AI 応答取得
- ✅ ExecutionLogger に記録

### 実行ログ記録項目

- タイムスタンプ
- Provider 名: Gemini
- Mode: Real / Demo
- 入力: 「こんにちは」
- 出力: AI 応答
- 成功/失敗: Success / Failure
- 応答時間

## テスト2: ChatGPT Real Mode テスト

### 前提条件
- OPENAI_API_KEY が設定されていること
- または Demo Mode で動作確認

### テスト手順

```bash
# 1. Dashboard にアクセス
# 2. Provider を ChatGPT に切り替え
# 3. 質問を送信
# 4. ChatGPT API へのリクエスト確認
```

### 期待結果

- ✅ ChatGPT Provider が Real Mode で初期化
- ✅ API リクエスト送信
- ✅ AI 応答取得
- ✅ ExecutionLogger に記録

### 実行ログ記録項目

- タイムスタンプ
- Provider 名: ChatGPT
- Mode: Real / Demo
- 入力: 質問内容
- 出力: AI 応答
- 成功/失敗: Success / Failure
- 応答時間

## テスト3: Agent Workflow テスト

### 入力
```
「簡単な計算アプリを設計してください」
```

### テスト手順

```bash
# 1. Dashboard から Workflow 実行
# 2. 入力: 「簡単な計算アプリを設計してください」
# 3. 以下の Agent が順序で実行されることを確認

TaskAgent
  ↓
DesignAgent
  ↓
ImplementationAgent
  ↓
ReviewAgent
```

### 期待結果

各 Agent について以下を確認：

1. **TaskAgent**
   - ✅ 開始時刻
   - ✅ 入力の解析
   - ✅ タスク分解
   - ✅ 結果

2. **DesignAgent**
   - ✅ 開始時刻
   - ✅ 設計の生成
   - ✅ 結果

3. **ImplementationAgent**
   - ✅ 開始時刻
   - ✅ 実装コードの生成
   - ✅ 結果

4. **ReviewAgent**
   - ✅ 開始時刻
   - ✅ レビュー実施
   - ✅ 結果

### 実行ログ記録項目

各 Agent について：

```
{
  "agent": "TaskAgent",
  "startTime": "2026-07-21T22:30:00.000Z",
  "input": "簡単な計算アプリを設計してください",
  "output": "...",
  "status": "success",
  "duration": 1234,
  "provider": "Gemini",
  "mode": "real"
}
```

## テスト4: ExecutionLogger 記録確認

### 確認項目

```bash
# tRPC executionLogs router でログを取得
curl http://localhost:3000/api/trpc/executionLogs.getLatestLogs
```

### 期待結果

- ✅ 全テストのログが記録されている
- ✅ Provider 名が正確に記録されている
- ✅ Mode (Real/Demo) が正確に記録されている
- ✅ AI 応答が記録されている
- ✅ 成功/失敗が記録されている

## テスト5: Dashboard 確認

### 確認項目

Dashboard 画面に以下が表示されていること：

1. **システム状態**
   - ✅ 初期化状態
   - ✅ Provider 数
   - ✅ Primary Provider

2. **Provider 状態**
   - ✅ Gemini (Real/Demo Mode)
   - ✅ ChatGPT (Real/Demo Mode)

3. **Agent 状態**
   - ✅ TaskAgent
   - ✅ DesignAgent
   - ✅ ImplementationAgent
   - ✅ ReviewAgent

4. **実行履歴**
   - ✅ 最新のワークフロー実行
   - ✅ 各 Agent の実行結果

## テスト実行結果

### テスト1: Gemini Real Mode
- 状態: [ ] 実施前 / [ ] 実施中 / [ ] 成功 / [ ] 失敗
- ログ: (後で記入)

### テスト2: ChatGPT Real Mode
- 状態: [ ] 実施前 / [ ] 実施中 / [ ] 成功 / [ ] 失敗
- ログ: (後で記入)

### テスト3: Agent Workflow
- 状態: [ ] 実施前 / [ ] 実施中 / [ ] 成功 / [ ] 失敗
- ログ: (後で記入)

### テスト4: ExecutionLogger
- 状態: [ ] 実施前 / [ ] 実施中 / [ ] 成功 / [ ] 失敗
- ログ: (後で記入)

### テスト5: Dashboard
- 状態: [ ] 実施前 / [ ] 実施中 / [ ] 成功 / [ ] 失敗
- スクリーンショット: (後で記入)

## ChatGPT レビュー用提出資料

テスト完了後、以下の資料を作成して提出：

1. **実装概要**
   - 実装した機能
   - 変更理由
   - 関連ファイル一覧

2. **Git 情報**
   - commit ID
   - branch
   - git status 結果

3. **動作証明**
   - 実行したコマンド
   - npm run check 結果
   - npm run build 結果

4. **AI 接続証明**
   - 使用 Provider（Gemini/OpenAI）
   - Real Mode または Demo Mode
   - API 通信結果
   - 実際の AI 応答ログ

5. **Agent Workflow 証明**
   - TaskAgent
   - DesignAgent
   - ImplementationAgent
   - ReviewAgent
   - 各 Agent の: 開始時刻、結果、成功/失敗

6. **Dashboard 確認**
   - 表示内容
   - スクリーンショット

7. **未完了事項**
   - 残課題
   - 次の推奨 STEP
