# STEP102-A: PoiPoi OS 司令塔設計ドキュメント

**作成日**: 2026-07-21  
**ステータス**: 設計フェーズ  
**目的**: PoiPoi OS 司令塔UI の実装前設計確定

---

## 1️⃣ Engine 一覧確認

### 発見されたEngine

| Engine 名 | ファイル場所 | クラス型 | 状態 |
|----------|-----------|---------|------|
| EvolutionEngine | `client/src/lib/poipoi/EvolutionEngine.ts` | class | ✅ 実装済み |
| MemoryEngine | `client/src/lib/poipoi/MemoryEngine.ts` | class | ✅ 実装済み |
| LearningEngine | `client/src/lib/poipoi/LearningEngine.ts` | class | ✅ 実装済み |
| SecurityEngine | `client/src/lib/poipoi/SecurityEngine.ts` | class | ✅ 実装済み |
| TestEngine | `client/src/lib/poipoi/TestEngine.ts` | class | ✅ 実装済み |
| ProductionEngine | `client/src/lib/poipoi/ProductionEngine.ts` | class | ✅ 実装済み |
| CostEngine | `client/src/lib/poipoi/CostEngine.ts` | class | ✅ 実装済み |
| InventoryEngine | `client/src/lib/poipoi/InventoryEngine.ts` | class | ✅ 実装済み |
| AutomationEngine | `client/src/lib/poipoi/AutomationEngine.ts` | class | ✅ 実装済み |
| BrainEngine | `client/src/lib/poipoi/BrainEngine.ts` | class | ✅ 実装済み |
| DashboardEngine | `client/src/lib/poipoi/DashboardEngine.ts` | class | ✅ 実装済み |
| PlanningEngine | `client/src/lib/poipoi/PlanningEngine.ts` | class | ✅ 実装済み |
| ReasoningEngine | `client/src/lib/poipoi/ReasoningEngine.ts` | class | ✅ 実装済み |
| VisionEngine | `client/src/lib/poipoi/VisionEngine.ts` | class | ✅ 実装済み |
| VoiceEngine | `client/src/lib/poipoi/VoiceEngine.ts` | class | ✅ 実装済み |

### Export 形式

```typescript
// 標準パターン
export class EvolutionEngine {
  // メソッド
}

// インターフェース
export interface AppState { ... }
export interface Memory { ... }
export interface SecurityIssue { ... }
export interface TestResult { ... }
export interface ProductionTask { ... }
export interface CostEntry { ... }
export interface InventoryItem { ... }
```

### 現在の依存関係

- **独立型**: 各 Engine は独立して実装
- **相互参照**: 一部 Engine が他の Engine を参照している可能性
- **UI 呼び出し**: 直接呼び出し可能（export されているため）

### UI/API から呼び出し可能性

✅ **呼び出し可能**: すべての Engine は class として export されており、インスタンス化可能

---

## 2️⃣ PoipoiOSManager 設計

### 責務

```typescript
class PoipoiOSManager {
  // 1. Engine 登録
  registerEngine(name: string, engine: BaseEngine): void
  
  // 2. Engine 起動管理
  startEngine(name: string): Promise<void>
  stopEngine(name: string): Promise<void>
  restartEngine(name: string): Promise<void>
  
  // 3. 状態取得
  getEngineStatus(name: string): EngineStatus
  getAllEngineStatus(): EngineStatus[]
  
  // 4. Health Check
  performHealthCheck(): HealthCheckResult
  getHealthStatus(): HealthStatus
  
  // 5. UI へのデータ提供
  getSystemStatus(): SystemStatus
  getEngineMetrics(): EngineMetrics
}
```

### 設計パターン

**Singleton パターン**: 全アプリケーションで単一インスタンス

```typescript
class PoipoiOSManager {
  private static instance: PoipoiOSManager
  private engines: Map<string, BaseEngine>
  
  static getInstance(): PoipoiOSManager {
    if (!this.instance) {
      this.instance = new PoipoiOSManager()
    }
    return this.instance
  }
}
```

### Engine 登録メカニズム

```typescript
interface BaseEngine {
  name: string
  status: 'running' | 'stopped' | 'error'
  start(): Promise<void>
  stop(): Promise<void>
  getStatus(): EngineStatus
  getMetrics(): EngineMetrics
}
```

---

## 3️⃣ API 設計

### エンドポイント一覧

#### 1. System Status 取得

```
GET /api/os/status

Response:
{
  "systemStatus": "healthy" | "degraded" | "error",
  "uptime": number,
  "lastCheck": string (ISO 8601),
  "engineCount": number,
  "runningEngines": number,
  "failedEngines": number
}
```

#### 2. Engine 一覧取得

```
GET /api/os/engines

Response:
{
  "engines": [
    {
      "name": "EvolutionEngine",
      "status": "running" | "stopped" | "error",
      "category": "AI" | "Business" | "System",
      "uptime": number,
      "lastError": string | null,
      "metrics": {
        "cpuUsage": number,
        "memoryUsage": number,
        "requestCount": number
      }
    },
    ...
  ]
}
```

#### 3. Engine 起動

```
POST /api/os/engine/:name/start

Response:
{
  "success": boolean,
  "message": string,
  "engineStatus": EngineStatus
}
```

#### 4. Engine 停止

```
POST /api/os/engine/:name/stop

Response:
{
  "success": boolean,
  "message": string,
  "engineStatus": EngineStatus
}
```

#### 5. Engine リスタート

```
POST /api/os/engine/:name/restart

Response:
{
  "success": boolean,
  "message": string,
  "engineStatus": EngineStatus
}
```

#### 6. Health Check 実行

```
POST /api/os/health-check

Response:
{
  "timestamp": string,
  "overallHealth": "healthy" | "degraded" | "critical",
  "checks": [
    {
      "engineName": string,
      "status": "pass" | "warning" | "fail",
      "details": string
    }
  ]
}
```

### tRPC 統合案

```typescript
// server/routers/os.ts
export const osRouter = router({
  getStatus: publicProcedure.query(async () => {
    return osManager.getSystemStatus()
  }),
  
  getEngines: publicProcedure.query(async () => {
    return osManager.getAllEngineStatus()
  }),
  
  startEngine: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      return osManager.startEngine(input.name)
    }),
  
  stopEngine: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      return osManager.stopEngine(input.name)
    }),
  
  performHealthCheck: publicProcedure.mutation(async () => {
    return osManager.performHealthCheck()
  })
})
```

---

## 4️⃣ Dashboard UI 設計

### 画面構成

```
┌─────────────────────────────────────────────┐
│  🦝 PoiPoi OS Dashboard                      │
├─────────────────────────────────────────────┤
│                                             │
│  📊 System Status                           │
│  ├─ Overall Health: 🟢 Healthy              │
│  ├─ Uptime: 24h 15m                         │
│  ├─ Running Engines: 12/15                  │
│  └─ Last Check: 2 min ago                   │
│                                             │
│  🧠 AI Engines                              │
│  ├─ ✅ EvolutionEngine (running)            │
│  ├─ ✅ MemoryEngine (running)               │
│  ├─ ✅ LearningEngine (running)             │
│  ├─ ✅ SecurityEngine (running)             │
│  ├─ ✅ TestEngine (running)                 │
│  └─ ⚠️  ReasoningEngine (degraded)          │
│                                             │
│  📦 Business Engines                        │
│  ├─ ✅ ProductionEngine (running)           │
│  ├─ ✅ InventoryEngine (running)            │
│  ├─ ✅ CostEngine (running)                 │
│  └─ ✅ PlanningEngine (running)             │
│                                             │
│  🔄 Self Improvement                        │
│  ├─ Learning Progress: 87%                  │
│  ├─ Improvement Proposals: 5                │
│  └─ Last Update: 1h ago                     │
│                                             │
│  📋 Recent Logs                             │
│  ├─ [INFO] EvolutionEngine started          │
│  ├─ [WARN] MemoryEngine high usage          │
│  └─ [ERROR] SecurityEngine scan failed      │
│                                             │
└─────────────────────────────────────────────┘
```

### コンポーネント構成

```
PoiPoiOSDashboard
├─ SystemStatusCard
│  ├─ HealthIndicator
│  ├─ UptimeDisplay
│  └─ EngineCountDisplay
├─ AIEnginesPanel
│  ├─ EngineCard (x5)
│  └─ EngineMetricsChart
├─ BusinessEnginesPanel
│  ├─ EngineCard (x4)
│  └─ EngineMetricsChart
├─ SelfImprovementPanel
│  ├─ LearningProgressBar
│  ├─ ProposalList
│  └─ LastUpdateTime
└─ LogsPanel
   ├─ LogEntry (x10)
   └─ LogFilter
```

### UI 技術スタック

- **フレームワーク**: React 19
- **スタイリング**: Tailwind CSS 4
- **コンポーネント**: shadcn/ui
- **チャート**: Recharts または Chart.js
- **リアルタイム更新**: WebSocket または polling

---

## 5️⃣ 実装ロードマップ

### Phase 1: 基礎構造（STEP102-B）
- [ ] PoipoiOSManager クラス実装
- [ ] BaseEngine インターフェース定義
- [ ] Engine 登録メカニズム実装

### Phase 2: API 層（STEP102-C）
- [ ] tRPC ルーター実装
- [ ] REST API エンドポイント実装
- [ ] Health Check ロジック実装

### Phase 3: UI 層（STEP102-D）
- [ ] Dashboard コンポーネント実装
- [ ] Engine Status Card 実装
- [ ] Real-time 更新機能実装

### Phase 4: 統合テスト（STEP102-E）
- [ ] 単体テスト作成
- [ ] 統合テスト作成
- [ ] E2E テスト作成

---

## 6️⃣ 既存機能への影響

### 影響なし ✅

- ✅ 既存 Engine は変更なし
- ✅ 既存 API は変更なし
- ✅ 既存 UI は変更なし
- ✅ 既存 tRPC ルーターは変更なし

### 追加のみ

- ➕ 新規: PoipoiOSManager
- ➕ 新規: OS Dashboard UI
- ➕ 新規: tRPC os ルーター
- ➕ 新規: /api/os エンドポイント

---

## 7️⃣ 技術的検討事項

### 1. Engine 初期化タイミング

**案 A**: アプリケーション起動時
- 利点: すべての Engine が常に利用可能
- 欠点: 起動時間が長くなる

**案 B**: オンデマンド初期化
- 利点: 起動時間が短い
- 欠点: 初回使用時に遅延

**推奨**: 案 A（アプリケーション起動時）

### 2. Engine 状態管理

**案 A**: Redux/Zustand で集中管理
- 利点: 状態管理が一元化
- 欠点: ボイラープレート増加

**案 B**: Context API で管理
- 利点: シンプル
- 欠点: パフォーマンス懸念

**推奨**: 案 A（Redux または Zustand）

### 3. Real-time 更新

**案 A**: WebSocket
- 利点: リアルタイム性が高い
- 欠点: インフラ複雑化

**案 B**: Polling（5秒間隔）
- 利点: シンプル
- 欠点: リアルタイム性が低い

**推奨**: 案 B（Polling）初期段階、後で WebSocket へ移行

---

## 8️⃣ セキュリティ考慮事項

### 認可

- ✅ Engine 起動/停止: `protectedProcedure`（認証ユーザーのみ）
- ✅ Status 取得: `publicProcedure`（全ユーザー）
- ✅ Health Check: `publicProcedure`（全ユーザー）

### 監査ログ

- ✅ Engine 起動/停止: 監査ログに記録
- ✅ Health Check 実行: 監査ログに記録
- ✅ エラー発生: 監査ログに記録

---

## 9️⃣ 次のステップ

### STEP102-B: 実装フェーズ

1. PoipoiOSManager クラス実装
2. tRPC os ルーター実装
3. Dashboard UI 実装
4. テスト作成
5. ビルド確認

### 推定工数

- PoipoiOSManager: 2-3 時間
- tRPC 統合: 1-2 時間
- Dashboard UI: 3-4 時間
- テスト: 2-3 時間
- **合計**: 8-12 時間

---

## 🔟 参考資料

### Engine 一覧

```
AI Engines (5):
- EvolutionEngine
- MemoryEngine
- LearningEngine
- SecurityEngine
- ReasoningEngine

Business Engines (4):
- ProductionEngine
- InventoryEngine
- CostEngine
- PlanningEngine

System Engines (6):
- AutomationEngine
- BrainEngine
- DashboardEngine
- TestEngine
- VisionEngine
- VoiceEngine
```

### ファイル構成

```
client/src/
├─ lib/poipoi/
│  ├─ EvolutionEngine.ts
│  ├─ MemoryEngine.ts
│  ├─ LearningEngine.ts
│  ├─ SecurityEngine.ts
│  ├─ TestEngine.ts
│  ├─ ProductionEngine.ts
│  ├─ CostEngine.ts
│  ├─ InventoryEngine.ts
│  ├─ AutomationEngine.ts
│  ├─ BrainEngine.ts
│  ├─ DashboardEngine.ts
│  ├─ PlanningEngine.ts
│  ├─ ReasoningEngine.ts
│  ├─ VisionEngine.ts
│  └─ VoiceEngine.ts
├─ pages/
│  └─ (Dashboard UI)
├─ components/
│  └─ (Dashboard Components)
└─ contexts/
   └─ (OS Context)
```

---

**設計完了**: 2026-07-21  
**次フェーズ**: STEP102-B 実装フェーズ
