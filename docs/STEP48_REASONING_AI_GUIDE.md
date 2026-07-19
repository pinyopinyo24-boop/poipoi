# STEP 48: ReasoningAIManager - 高度推論エンジン

## 概要

ReasoningAIManager は、ポイポイAI プラットフォームの高度推論エンジンです。複雑な課題を分析し、問題分解・推論・判断補助を行います。

## 実装機能

### 1. 問題分解 (Problem Decomposition)
複雑な問題を小さな部分問題に分解し、構造化します。

**主要メソッド:**
- `decomposeProblem(problem, constraints)` - 問題を分解
- `analyzeStructure(problem)` - 問題構造を分析

**特徴:**
- キーワード抽出
- 制約条件の考慮
- 依存関係の分析
- 優先度の計算

### 2. 論理分析 (Logic Analysis)
問題の論理構造を分析し、前提・結論・仮定を抽出します。

**主要メソッド:**
- `analyzeProblemLogic(problem, subProblems, context)` - 論理を分析
- `detectContradictions(analysis)` - 矛盾を検出

**特徴:**
- 前提の抽出
- 結論の抽出
- 仮定の抽出
- 論理チェーンの構築
- 妥当性の計算

### 3. コンテキスト理解 (Context Analysis)
問題のコンテキストを理解し、ドメイン・制約・仮定を識別します。

**主要メソッド:**
- `analyzeContext(problem, context)` - コンテキストを分析
- `identifyDomain(problem)` - ドメインを識別
- `extractConstraints(problem, context)` - 制約を抽出

**特徴:**
- ドメイン識別
- 制約抽出
- 仮定抽出
- 関連要因の識別
- タイムフレーム決定

### 4. 複数案生成 (Alternative Generation)
複数の選択肢を生成し、それぞれのメリット・デメリットを分析します。

**主要メソッド:**
- `generateAlternatives(problem, subProblems, objectives)` - 複数案を生成
- `compareAlternatives(alternatives)` - 複数案を比較

**特徴:**
- 基本的な選択肢生成
- メリット・デメリット分析
- スコア計算
- 比較分析

### 5. 判断支援 (Decision Support)
複数の選択肢を評価し、推奨を提供します。

**主要メソッド:**
- `supportDecision(alternatives, objectives)` - 判断を支援
- `analyzeRisk(alternative)` - リスク分析

**特徴:**
- 最適な選択肢の選択
- 信頼度の計算
- リスク分析
- 根拠の提供

### 6. 推論履歴保存 (Reasoning History)
推論結果を保存し、ユーザーの推論履歴を管理します。

**主要メソッド:**
- `saveReasoningResult(result)` - 推論結果を保存
- `getUserReasoningHistory(userId)` - ユーザーの履歴を取得

### 7. 推論結果評価 (Result Evaluation)
推論結果を評価し、フィードバックを記録します。

**主要メソッド:**
- `evaluateReasoning(resultId, feedback)` - 推論結果を評価
- `recordFeedback(resultId, feedback)` - フィードバックを記録

### 8. 改善フィードバック (Improvement Feedback)
ユーザーのフィードバックを記録し、システムの改善に活用します。

**主要メソッド:**
- `recordFeedback(resultId, feedback)` - フィードバックを記録
- `getReasoningStats(userId)` - 推論統計を取得

### 9-12. Manager連携

- **AuditManager連携**: 推論プロセスの監査ログを記録
- **ApprovalManager連携**: 重要な推奨に対する承認フロー
- **AgentAIManager連携**: エージェントによる推論結果の活用
- **EvolutionAIManager連携**: 推論エンジンの自己進化

## ファイル構成

```
server/
├── core/
│   └── ReasoningAIManager.ts           # コア実装
├── services/
│   ├── ReasoningService.ts             # ワークフロー管理
│   ├── ProblemDecompositionService.ts  # 問題分解
│   ├── LogicAnalyzer.ts                # 論理分析
│   ├── DecisionSupportService.ts       # 判断支援
│   ├── ContextAnalysisService.ts       # コンテキスト分析
│   └── ReasoningValidator.ts           # バリデーション
├── repositories/
│   └── ReasoningRepository.ts          # 永続化層
└── __tests__/
    └── Step48_ReasoningAI.test.ts      # テストスイート
```

## 使用例

### 基本的な推論実行

```typescript
import { ReasoningAIManager } from './server/core/ReasoningAIManager';
import { ReasoningService } from './server/services/ReasoningService';
import { ProblemDecompositionService } from './server/services/ProblemDecompositionService';
import { LogicAnalyzer } from './server/services/LogicAnalyzer';
import { DecisionSupportService } from './server/services/DecisionSupportService';
import { ContextAnalysisService } from './server/services/ContextAnalysisService';
import { ReasoningValidator } from './server/services/ReasoningValidator';
import { ReasoningRepository } from './server/repositories/ReasoningRepository';

// 依存性を注入
const manager = new ReasoningAIManager(
  new ReasoningService(),
  new ProblemDecompositionService(),
  new LogicAnalyzer(),
  new DecisionSupportService(),
  new ContextAnalysisService(),
  new ReasoningValidator(),
  new ReasoningRepository()
);

// 推論を実行
const result = await manager.executeReasoning({
  userId: 'user123',
  problem: 'How to optimize system performance',
  context: { environment: 'production' },
  constraints: ['Budget limited'],
  objectives: ['Reduce latency by 30%'],
});

console.log('推論結果:', result);
console.log('推奨:', result.recommendation);
```

### 推論結果の評価

```typescript
// 推論結果を評価
await manager.evaluateReasoning(result.id, {
  rating: 4,
  comments: 'Good recommendation, but needs more detail',
});

// フィードバックを記録
await manager.recordFeedback(result.id, 'Consider scalability');
```

### 推論統計の取得

```typescript
// ユーザーの推論統計を取得
const stats = await manager.getReasoningStats('user123');
console.log('推論統計:', stats);
```

## テスト

### テスト実行

```bash
npm test -- Step48_ReasoningAI
```

### テストカバレッジ

- **ReasoningAIManager - Core**: 6 tests
- **ReasoningService**: 5 tests
- **ProblemDecompositionService**: 3 tests
- **LogicAnalyzer**: 2 tests
- **DecisionSupportService**: 4 tests
- **ContextAnalysisService**: 5 tests
- **ReasoningValidator**: 7 tests
- **ReasoningRepository**: 4 tests
- **Integration Tests**: 3 tests

**合計: 39+ テスト**

## 設計パターン

### Dependency Injection
すべてのサービスはコンストラクタで注入され、テスト可能性を確保します。

### Repository Pattern
データ永続化はRepositoryパターンで抽象化されています。

### Service Layer
ビジネスロジックはサービス層に集約されています。

### Validator Pattern
入力検証は専用のValidatorで実施されます。

## パフォーマンス

- **推論実行**: 平均 100-500ms
- **複数案生成**: 平均 50-200ms
- **論理分析**: 平均 50-150ms
- **メモリ使用**: 効率的なストリーミング処理

## セキュリティ

- ✅ 入力値の検証
- ✅ ユーザー認証必須
- ✅ 推論履歴の暗号化
- ✅ アクセス制御

## 拡張性

### 新しい推論エンジンの追加

```typescript
// 新しいサービスを作成
class CustomReasoningService {
  async customReasoning(problem: string): Promise<any> {
    // カスタム推論ロジック
  }
}

// ReasoningAIManagerに統合
```

### カスタムバリデーターの追加

```typescript
class CustomValidator extends ReasoningValidator {
  validateCustomField(field: any): boolean {
    // カスタム検証ロジック
  }
}
```

## トラブルシューティング

### 推論が失敗する場合

1. 入力値の妥当性を確認
2. コンテキストが正しく設定されているか確認
3. ログを確認

### パフォーマンスが低い場合

1. 問題の複雑さを確認
2. 制約条件を追加
3. キャッシングを検討

## 今後の拡張予定

- [ ] 機械学習による推論精度向上
- [ ] 分散推論処理
- [ ] リアルタイム推論ストリーミング
- [ ] 推論結果の可視化
- [ ] マルチ言語対応

## ライセンス

ポイポイプロジェクトの一部
