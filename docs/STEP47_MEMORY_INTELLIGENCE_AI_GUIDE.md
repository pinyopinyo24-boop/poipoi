# STEP 47: MemoryIntelligenceAIManager - AI記憶知能管理システム

## 概要

**MemoryIntelligenceAIManager** は、ポイポイAIが長期間利用されても、必要な情報だけを保持し、経験から賢くなる高度記憶管理システムです。

### 主な特徴

- **記憶重要度判定**: 各メモリの重要度を自動計算
- **不要メモリ削除**: 重複・低優先度メモリを自動削除
- **長期記憶管理**: 古いメモリをアーカイブ・圧縮
- **経験データ分析**: パターン認識と学習
- **類似記憶検索最適化**: 高速な類似メモリ検索
- **記憶圧縮**: メモリ効率を最大化
- **記憶復元**: 圧縮メモリの復元機能
- **学習データ生成**: AI学習用データの自動生成
- **複数Manager連携**: AuditManager、ApprovalManager、EvolutionAIManager、AgentAIManager との連携

## アーキテクチャ

```
MemoryIntelligenceAIManager (Core)
├── MemoryAnalysisService (分析)
├── ImportanceScoreService (重要度計算)
├── MemoryCleanupService (クリーンアップ)
├── MemorySearchOptimizer (検索最適化)
├── ExperienceLearningService (学習)
├── MemoryValidator (検証)
└── MemoryIntelligenceRepository (永続化)
```

## ファイル構成

```
server/
├── core/
│   └── MemoryIntelligenceAIManager.ts          # コア実装
├── services/
│   ├── MemoryAnalysisService.ts                # メモリ分析
│   ├── ImportanceScoreService.ts               # 重要度スコア計算
│   ├── MemoryCleanupService.ts                 # クリーンアップ・圧縮
│   ├── MemorySearchOptimizer.ts                # 検索最適化
│   ├── ExperienceLearningService.ts            # 経験学習
│   └── MemoryValidator.ts                      # バリデーション
├── repositories/
│   └── MemoryIntelligenceRepository.ts         # データ永続化
└── __tests__/
    └── Step47_MemoryIntelligenceAI.test.ts     # テストスイート
```

## 実装機能

### 1. 記憶重要度判定 (Memory Importance Evaluation)

```typescript
const score = await manager.evaluateMemoryImportance(memoryId);
// {
//   memoryId: string,
//   score: number (0-1),
//   factors: { frequency, recency, relevance, uniqueness },
//   recommendation: string
// }
```

**計算要因:**
- **頻度 (Frequency)**: アクセス回数
- **最近性 (Recency)**: 最後のアクセス時刻
- **関連性 (Relevance)**: コンテンツの関連度
- **ユニーク性 (Uniqueness)**: 内容の独自性

### 2. 不要メモリ削除 (Redundant Memory Removal)

```typescript
const result = await manager.removeRedundantMemories(userId);
// {
//   removedCount: number,
//   freedMemory: number,
//   remainingMemories: number,
//   cleanupTime: number
// }
```

**削除対象:**
- 完全に重複したメモリ
- 低優先度メモリ
- アクセスされていないメモリ

### 3. 長期記憶管理 (Long-term Memory Management)

```typescript
const analysis = await manager.manageLongTermMemory(userId);
// {
//   totalMemories: number,
//   importantMemories: number,
//   redundantMemories: number,
//   compressionRatio: number,
//   averageImportance: number,
//   memoryHealth: number (0-100)
// }
```

**機能:**
- 古いメモリのアーカイブ
- 低重要度メモリの削除
- メモリヘルス計算

### 4. 経験データ分析 (Experience Data Analysis)

```typescript
const experience = await manager.analyzeExperienceData(userId);
// {
//   userId: string,
//   patterns: string[],
//   insights: string[],
//   recommendations: string[],
//   learningScore: number,
//   generatedAt: number
// }
```

**分析内容:**
- パターン認識
- インサイト生成
- 推奨事項生成

### 5. 類似記憶検索最適化 (Similar Memory Search Optimization)

```typescript
const results = await manager.optimizeSimilarMemorySearch(userId, query);
// [
//   {
//     memoryId: string,
//     similarity: number,
//     content: string,
//     relevanceScore: number
//   }
// ]
```

**検索手法:**
- コサイン類似度計算
- キーワードマッチング
- カテゴリ別検索
- 時間範囲検索

### 6. 記憶圧縮 (Memory Compression)

```typescript
const result = await manager.compressMemories(userId);
// {
//   compressedCount: number,
//   compressionRatio: number
// }
```

**圧縮方式:**
- gzip圧縮
- Base64エンコード
- 自動圧縮率計算

### 7. 記憶復元 (Memory Restoration)

```typescript
const restored = await manager.restoreMemory(memoryId);
// MemoryItem (圧縮解除)
```

**復元処理:**
- Base64デコード
- gunzip解凍
- メタデータ復元

### 8. 学習データ生成 (Learning Data Generation)

```typescript
const learningData = await manager.generateLearningData(userId);
// ExperienceData
```

**生成内容:**
- 学習パターン
- 知識抽出
- 成長トレンド分析

## サービス詳細

### MemoryAnalysisService

```typescript
// メモリパターン分析
const analysis = await analysisService.analyzeMemoryPatterns(memories);

// カテゴリ別分析
const categoryAnalysis = await analysisService.analyzeByCategory(memories);

// 時間別分析
const timeAnalysis = await analysisService.analyzeByTimeRange(
  memories,
  startTime,
  endTime
);

// アクセスパターン分析
const accessPatterns = await analysisService.analyzeAccessPatterns(memories);
```

### ImportanceScoreService

```typescript
// 重要度スコア計算
const score = await importanceService.calculateImportanceScore(memory);

// バッチ計算
const scores = await importanceService.calculateBatchImportanceScores(memories);

// ランキング
const ranked = await importanceService.rankMemoriesByImportance(scores);

// 低重要度メモリ特定
const lowImportance = await importanceService.identifyLowImportanceMemories(
  scores,
  0.3
);

// スコア分布分析
const distribution = await importanceService.analyzeScoreDistribution(scores);
```

### MemoryCleanupService

```typescript
// 重複メモリ特定
const redundant = await cleanupService.identifyRedundantMemories(memories);

// 圧縮
const compressed = await cleanupService.compressMemory(memory);

// 解凍
const decompressed = await cleanupService.decompressMemory(compressedData);

// 古いメモリ特定
const oldMemories = await cleanupService.identifyOldMemories(memories, 365);

// 未使用メモリ特定
const unusedMemories = await cleanupService.identifyUnusedMemories(memories, 90);

// 最適化
const optimization = await cleanupService.optimizeMemories(memories);
```

### MemorySearchOptimizer

```typescript
// 類似メモリ検索
const results = await searchOptimizer.searchSimilarMemories(query, memories);

// キーワード検索
const keywordResults = await searchOptimizer.searchByKeywords(
  ['keyword1', 'keyword2'],
  memories
);

// カテゴリ検索
const categoryResults = await searchOptimizer.searchByCategory(
  'category',
  memories
);

// 時間範囲検索
const timeResults = await searchOptimizer.searchByTimeRange(
  startTime,
  endTime,
  memories
);

// 高度な検索
const advancedResults = await searchOptimizer.advancedSearch(
  query,
  { minImportance: 0.5, category: 'learning' },
  memories
);
```

### ExperienceLearningService

```typescript
// 経験パターン抽出
const experience = await experienceService.extractExperiencePatterns(memories);

// 学習データ生成
const learningData = await experienceService.generateLearningData(memories);

// 知識抽出
const knowledge = await experienceService.extractKnowledge(memories);

// 成長トレンド分析
const trend = await experienceService.analyzeGrowthTrend(memories);

// 学習パス生成
const path = await experienceService.generateLearningPath(memories);
```

### MemoryValidator

```typescript
// メモリバリデーション
const results = await validator.validateMemories(memories);

// 単一メモリバリデーション
const result = await validator.validateMemory(memory);

// 整合性チェック
const consistency = await validator.checkConsistency(memories);

// データ型バリデーション
const typeValidation = await validator.validateDataTypes(memory);

// ビジネスロジックバリデーション
const businessValidation = await validator.validateBusinessLogic(memory);

// 完全バリデーション
const complete = await validator.validateComplete(memory);

// バリデーションレポート
const report = await validator.generateValidationReport(memories);
```

## テスト仕様

### テストカバレッジ

- **MemoryIntelligenceAIManager - Core**: 6 tests
- **MemoryAnalysisService**: 3 tests
- **ImportanceScoreService**: 4 tests
- **MemoryCleanupService**: 4 tests
- **MemorySearchOptimizer**: 5 tests
- **ExperienceLearningService**: 5 tests
- **MemoryValidator**: 5 tests
- **MemoryIntelligenceRepository**: 7 tests
- **Integration Tests**: 4 tests

**合計: 43+ tests**

### テスト実行

```bash
npm test -- Step47_MemoryIntelligenceAI
```

## Dependency Injection

```typescript
const manager = new MemoryIntelligenceAIManager(
  new MemoryAnalysisService(),
  new ImportanceScoreService(),
  new MemoryCleanupService(),
  new MemorySearchOptimizer(),
  new ExperienceLearningService(),
  new MemoryValidator(),
  new MemoryIntelligenceRepository()
);
```

## Repository Pattern

すべてのデータ永続化は `MemoryIntelligenceRepository` を通じて行われます。

```typescript
// メモリ保存
await repository.saveMemory(memory);

// メモリ取得
const memory = await repository.getMemory(memoryId);

// ユーザーメモリ取得
const memories = await repository.getUserMemories(userId);

// メモリ更新
await repository.updateMemory(memory);

// メモリ削除
await repository.deleteMemory(memoryId);

// メモリアーカイブ
await repository.archiveMemory(memoryId);
```

## Manager連携

### AuditManager連携
- メモリ操作の監査ログ記録
- 削除・圧縮操作の追跡

### ApprovalManager連携
- 大量削除の承認フロー
- 重要メモリ削除の承認

### EvolutionAIManager連携
- メモリ分析結果を進化エンジンに提供
- 学習データの自動生成

### AgentAIManager連携
- エージェントの会話履歴管理
- 経験データの自動学習

## 使用例

```typescript
// 1. マネージャーの初期化
const manager = new MemoryIntelligenceAIManager(
  new MemoryAnalysisService(),
  new ImportanceScoreService(),
  new MemoryCleanupService(),
  new MemorySearchOptimizer(),
  new ExperienceLearningService(),
  new MemoryValidator(),
  new MemoryIntelligenceRepository()
);

// 2. メモリ分析
const stats = await manager.getMemoryStats(userId);
console.log(`Total memories: ${stats.totalMemories}`);
console.log(`Memory health: ${stats.memoryHealth}%`);

// 3. 不要メモリ削除
const cleanupResult = await manager.removeRedundantMemories(userId);
console.log(`Removed: ${cleanupResult.removedCount} memories`);

// 4. 経験学習
const experience = await manager.analyzeExperienceData(userId);
console.log(`Patterns: ${experience.patterns.length}`);
console.log(`Learning score: ${experience.learningScore}`);

// 5. メモリ検索
const searchResults = await manager.optimizeSimilarMemorySearch(
  userId,
  'TypeScript learning'
);
console.log(`Found: ${searchResults.length} similar memories`);

// 6. メモリ圧縮
const compression = await manager.compressMemories(userId);
console.log(`Compression ratio: ${compression.compressionRatio}`);

// 7. バリデーション
const validation = await manager.validateMemories(userId);
console.log(`Valid: ${validation.valid}, Invalid: ${validation.invalid}`);
```

## パフォーマンス

- **メモリ分析**: O(n) - n はメモリ数
- **重要度計算**: O(1) - メモリあたり
- **検索**: O(n) - 線形検索
- **圧縮**: O(n) - 圧縮率に依存
- **バリデーション**: O(n) - n はメモリ数

## セキュリティ

- すべてのメモリ操作はユーザーIDで分離
- 圧縮データはBase64エンコード
- バリデーション時に型チェック実施
- 削除操作は監査ログに記録

## ベストプラクティス

1. **定期的なメモリ分析**: 定期的に `getMemoryStats()` を実行
2. **自動クリーンアップ**: スケジュール実行で `removeRedundantMemories()` を定期実行
3. **圧縮管理**: 古いメモリは自動的に圧縮
4. **バリデーション**: 重要な操作前にバリデーション実施
5. **エラーハンドリング**: すべての操作にエラーハンドラを実装

## トラブルシューティング

### メモリが見つからない
```typescript
const validation = await manager.validateMemories(userId);
if (validation.invalid > 0) {
  console.log('Invalid memories found');
}
```

### 圧縮失敗
```typescript
const restored = await manager.restoreMemory(memoryId);
if (!restored.compressed) {
  console.log('Memory successfully decompressed');
}
```

### 検索結果が少ない
```typescript
const advancedResults = await manager.optimizeSimilarMemorySearch(
  userId,
  query
);
// 検索結果が少ない場合は、クエリを調整
```

## まとめ

**MemoryIntelligenceAIManager** は、ポイポイAIの記憶管理を自動化し、長期利用を支援する高度なシステムです。重要度判定、自動クリーンアップ、経験学習を通じて、AIが賢く成長し続けることを実現します。
