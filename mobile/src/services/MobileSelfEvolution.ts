import { updateMobilePoiPoiState, synchronizeMobilePoiPoiState, getMobilePoiPoiState, getMobilePoiPoiAccountNamespace } from './PoiPoiUnifiedStateSync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AndroidLocalAI } from './AndroidLocalAI';

const scopedEvolutionStorage = {
  async key(key: string): Promise<string> {
    return key + ':' + await getMobilePoiPoiAccountNamespace();
  },
  async getItem(key: string) { return AsyncStorage.getItem(await this.key(key)); },
  async setItem(key: string, value: string) { return AsyncStorage.setItem(await this.key(key), value); },
  async multiGet(keys: string[]) {
    const scoped = await Promise.all(keys.map(key => this.key(key)));
    const entries = await AsyncStorage.multiGet(scoped);
    return entries.map((entry, i) => [keys[i], entry[1]] as [string, string | null]);
  },
  async multiSet(entries: [string, string][]) {
    const scoped = await Promise.all(entries.map(async ([key, value]) => [await this.key(key), value] as [string, string]));
    return AsyncStorage.multiSet(scoped);
  },
  async multiRemove(keys: string[]) {
    return AsyncStorage.multiRemove(await Promise.all(keys.map(key => this.key(key))));
  },
};

export type FeatureProposal = {
  request: string;
  proposal: string;
  status: 'pending' | 'approved';
};

export class MobileSelfEvolution {
  private static operationQueue: Promise<void> = Promise.resolve();

  private static async exclusive<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    const previous = this.operationQueue;
    let release!: () => void;

    this.operationQueue = new Promise<void>(resolve => {
      release = resolve;
    });

    await previous;

    try {
      return await operation();
    } finally {
      release();
    }
  }
  static async getProposals(): Promise<FeatureProposal[]> {
    const saved = await scopedEvolutionStorage.getItem('poipoi:evolution:proposals');
    if (!saved) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(saved);
    } catch {
      throw new Error('自己進化の保存データが破損しています');
    }

    if (
      !Array.isArray(parsed) ||
      !parsed.every(item =>
        item &&
        typeof item.request === 'string' &&
        typeof item.proposal === 'string' &&
        (item.status === 'pending' || item.status === 'approved')
      )
    ) {
      throw new Error('自己進化の保存形式が不正です');
    }

    return parsed as FeatureProposal[];
  }
    static async proposeExclusive(request: string): Promise<FeatureProposal> {
    if (typeof request !== 'string' || !request.trim()) {
      throw new Error('追加したい機能を入力してください');
    }

    return this.exclusive(async () => {
      return this.propose(request.trim());
    });
  }
  static async propose(request: string): Promise<FeatureProposal> {
    if (
      typeof request !== 'string' ||
      !request.trim() ||
      request.length > 10000
    ) {
      throw new Error('機能追加の依頼内容が不正です');
    }
    request = request.trim();
    const proposal = await AndroidLocalAI.sendMessage(
      `次の機能追加要求について、実装方針・必要な処理・安全上の注意を日本語で提案してください。まだ実行しないでください。\n${request}`
    );

    const feature: FeatureProposal = { request, proposal, status: 'pending' };
    const key = 'poipoi:evolution:proposals';
    const history = await this.getProposals();
    history.push(feature);
    await scopedEvolutionStorage.setItem(key, JSON.stringify(history));
    return feature;
  }

    static async approveAndSaveExclusive(index: number): Promise<FeatureProposal> {
    return this.exclusive(async () => {
      return this.approveAndSave(index);
    });
  }
  static async approveAndSave(index: number): Promise<FeatureProposal> {
    const history = await this.getProposals();
    if (!Number.isInteger(index) || index < 0 || index >= history.length) {
      throw new Error('提案が見つかりません');
    }
    const approved = this.approve(history[index]);
    history[index] = approved;
    await scopedEvolutionStorage.setItem('poipoi:evolution:proposals', JSON.stringify(history));
    try {
      await this.syncEvolutionToUnifiedState();
    } catch (error) {
      console.warn('[PoiPoi] Evolution state registration failed:', error);
    }
    try {
      const disconnected = await AsyncStorage.getItem('POIPOI_PC_DISCONNECTED');
      const configuredUrl = await AsyncStorage.getItem('POIPOI_PC_URL');

      if (disconnected !== '1' && configuredUrl?.trim()) {
        await synchronizeMobilePoiPoiState(configuredUrl.trim());
        await this.restoreEvolutionFromUnifiedState();
      }
    } catch (error) {
      console.warn('[PoiPoi] Evolution PC sync unavailable:', error);
    }
    return approved;
  }

    static async generateFeatureDesignExclusive(index: number): Promise<string> {
    return this.exclusive(async () => {
      return this.generateFeatureDesign(index);
    });
  }
  static async generateFeatureDesign(index: number): Promise<string> {
    const history = await this.getProposals();
    const feature = history[index];
    if (!feature || feature.status !== 'approved') {
      throw new Error('承認済みの提案がありません');
    }
    const design = await AndroidLocalAI.sendMessage(
      `次の承認済み機能について、実装設計を作成してください。既存機能は削除せず、コードは実行しないでください。\n要求: ${feature.request}\n提案: ${feature.proposal}`
    );
    await scopedEvolutionStorage.setItem('poipoi:evolution:design:' + index, design);
    return design;
  }
  static async getFeatureDesign(index: number): Promise<string> {
    const history = await this.getProposals();
    if (!Number.isInteger(index) || index < 0 || index >= history.length) {
      throw new Error('提案が見つかりません');
    }
    return await scopedEvolutionStorage.getItem('poipoi:evolution:design:' + index)
      || '設計はまだ生成されていません';
  }
    static async activateFeatureExclusive(index: number): Promise<string> {
    return this.exclusive(async () => {
      return this.activateFeature(index);
    });
  }
  static async activateFeature(index: number): Promise<string> {
    const history = await this.getProposals();
    const feature = history[index];
    if (!feature || feature.status !== 'approved') {
      throw new Error('承認済みの提案がありません');
    }

    const design = await scopedEvolutionStorage.getItem('poipoi:evolution:design:' + index);
    if (!design) {
      throw new Error('先に設計を生成してください');
    }

    const key = 'poipoi:evolution:active';
    const saved = await scopedEvolutionStorage.getItem(key);
    const active: number[] = (() => {
        try {
          const parsed: unknown = saved ? JSON.parse(saved) : [];
          return Array.isArray(parsed)
            ? [...new Set(parsed.filter((v): v is number =>
                typeof v === 'number' &&
                Number.isSafeInteger(v) &&
                v >= 0
              ))]
            : [];
        } catch {
          return [];
        }
      })();

    if (!active.includes(index)) {
      active.push(index);
      await scopedEvolutionStorage.setItem(key, JSON.stringify(active));
    }

    return '拡張機能を登録しました: ' + feature.request;
  }
  static async getActiveFeatures(): Promise<string> {
    const saved = await scopedEvolutionStorage.getItem('poipoi:evolution:active');
    let active: number[] = [];

    if (saved) {
      let parsed: unknown;

      try {
        parsed = JSON.parse(saved);
      } catch {
        throw new Error('登録済み機能データが破損しています');
      }

      if (
        !Array.isArray(parsed) ||
        !parsed.every(value =>
          Number.isSafeInteger(value) && value >= 0
        )
      ) {
        throw new Error('登録済み機能データの形式が不正です');
      }

      active = parsed as number[];
    }

    const history = await this.getProposals();

    if (!active.length) return '登録済み機能はありません';

    return active.map(i =>
      (i + 1) + '. ' + (history[i]?.request || '不明な機能')
    ).join('\n');
  }
    static async deactivateFeatureExclusive(index: number): Promise<string> {
    return this.exclusive(async () => {
      return this.deactivateFeature(index);
    });
  }
  static async deactivateFeature(index: number): Promise<string> {
    const history = await this.getProposals();
    if (!Number.isInteger(index) || index < 0 || index >= history.length) {
      throw new Error('提案が見つかりません');
    }

    const key = 'poipoi:evolution:active';
    const saved = await scopedEvolutionStorage.getItem(key);
    const active: number[] = (() => {
        try {
          const parsed: unknown = saved ? JSON.parse(saved) : [];
          return Array.isArray(parsed)
            ? [...new Set(parsed.filter((v): v is number =>
                typeof v === 'number' &&
                Number.isSafeInteger(v) &&
                v >= 0
              ))]
            : [];
        } catch {
          return [];
        }
      })();

    if (!active.includes(index)) {
      return 'この機能は登録されていません';
    }

    await scopedEvolutionStorage.setItem(
      key,
      JSON.stringify(active.filter(i => i !== index))
    );

    return '登録を解除しました: ' + history[index].request;
  }
  static async getFeatureStatus(index: number): Promise<string> {
    const history = await this.getProposals();
    if (!Number.isInteger(index) || index < 0 || index >= history.length) {
      throw new Error('提案が見つかりません');
    }

    const saved = await scopedEvolutionStorage.getItem('poipoi:evolution:active');
    const active: number[] = (() => {
        try {
          const parsed: unknown = saved ? JSON.parse(saved) : [];
          return Array.isArray(parsed)
            ? [...new Set(parsed.filter((v): v is number =>
                typeof v === 'number' &&
                Number.isSafeInteger(v) &&
                v >= 0
              ))]
            : [];
        } catch {
          return [];
        }
      })();
    const design = await scopedEvolutionStorage.getItem('poipoi:evolution:design:' + index);

    return [
      '機能: ' + history[index].request,
      '承認: ' + (history[index].status === 'approved' ? '済み' : '未承認'),
      '設計: ' + (design ? '保存済み' : '未作成'),
      '登録: ' + (active.includes(index) ? '有効' : '無効'),
      '実行: ' + (active.includes(index) && design ? 'ローカルAI実行可能' : '利用不可')
    ].join('\n');
  }
  static async executeFeature(index: number, input: string): Promise<string> {
    if (typeof input !== 'string' || !input.trim()) {
      throw new Error('実行する依頼を入力してください');
    }
    const history = await this.getProposals();
    if (!Number.isInteger(index) || index < 0 || index >= history.length) {
      throw new Error('提案が見つかりません');
    }
    if (history[index].status !== 'approved') {
      throw new Error('未承認の機能です');
    }

    const saved = await scopedEvolutionStorage.getItem('poipoi:evolution:active');
    const active: number[] = (() => {
        try {
          const parsed: unknown = saved ? JSON.parse(saved) : [];
          return Array.isArray(parsed)
            ? [...new Set(parsed.filter((v): v is number =>
                typeof v === 'number' &&
                Number.isSafeInteger(v) &&
                v >= 0
              ))]
            : [];
        } catch {
          return [];
        }
      })();
    if (!active.includes(index)) {
      throw new Error('登録されていない機能です');
    }

    const design = await scopedEvolutionStorage.getItem('poipoi:evolution:design:' + index);
    if (!design) {
      throw new Error('設計がありません');
    }

    return AndroidLocalAI.sendMessage(
      '次の機能設計に従って依頼に回答してください。外部操作やコード実行は行わないでください。\n'
      + '機能: ' + history[index].request
      + '\n設計: ' + design
      + '\n依頼: ' + input
    );
  }
  static async exportEvolutionData(): Promise<string> {
    const proposals = await this.getProposals();
    const saved = await scopedEvolutionStorage.getItem('poipoi:evolution:active');
    const active = saved ? JSON.parse(saved) : [];
    const designs = await Promise.all(
      proposals.map((_, index) =>
        scopedEvolutionStorage.getItem('poipoi:evolution:design:' + index)
      )
    );

    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      proposals,
      active,
      designs
    });
  }

    static async importEvolutionDataExclusive(json: string): Promise<void> {
    return this.exclusive(async () => {
      const previous = await this.exportEvolutionData();
      const backupKey = 'poipoi:evolution:before-import';

      await scopedEvolutionStorage.setItem(backupKey, previous);

      try {
        await this.importEvolutionData(json);
      } catch (error) {
        try {
          await this.importEvolutionData(previous);
        } catch (rollbackError) {
          throw new Error(
            '復元失敗。自動退避データを保持しました: ' +
            String(rollbackError)
          );
        }
        throw error;
      }
    });
  }

  static async restorePreviousEvolutionData(): Promise<string> {
    const backupKey = 'poipoi:evolution:before-import';
    const saved = await scopedEvolutionStorage.getItem(backupKey);

    if (!saved) {
      throw new Error('復元前のバックアップがありません');
    }

    await this.exclusive(async () => {
      const current = await this.exportEvolutionData();

      try {
        await this.importEvolutionData(saved);
      } catch (error) {
        await this.importEvolutionData(current);
        throw error;
      }

      await scopedEvolutionStorage.setItem(backupKey, current);
    });

    return '復元前の自己進化データに戻しました';
  }

  static async getPreviousEvolutionBackup(): Promise<string> {
    const saved = await scopedEvolutionStorage.getItem(
      'poipoi:evolution:before-import'
    );

    if (!saved) {
      throw new Error('復元前のバックアップがありません');
    }

    return saved;
  }
    static async syncEvolutionToUnifiedState(): Promise<void> {
    const data = await this.exportEvolutionData();

    await updateMobilePoiPoiState({
      id: 'mobile_evolution_snapshot',
      category: 'evolution',
      value: data,
      updatedAt: Date.now(),
      origin: 'android',
    });
  }
  static async getPcEvolutionResultsFromUnifiedState(): Promise<unknown[]> {
    const state = await getMobilePoiPoiState();

    return state.records
      .filter(record =>
        record.category === 'evolution' &&
        record.origin === 'pc' &&
        (record.id.startsWith('evolution_run_') || record.id.startsWith('evolution-'))
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(record => {
        try {
          return JSON.parse(record.value);
        } catch {
          return null;
        }
      })
      .filter((value): value is NonNullable<typeof value> =>
        value !== null
      );
  }
  // POIPOI_PC_EVOLUTION_INTEGRATION_V3
  // POIPOI_PC_EVOLUTION_APPLY_V1
  static async applyPcEvolutionResults(): Promise<{
    imported: number;
    skipped: number;
  }> {
    const state = await getMobilePoiPoiState();

    const pcRecords = state.records.filter(record =>
      record.category === 'evolution' &&
      record.origin === 'pc' &&
      (record.id.startsWith('evolution_run_') || record.id.startsWith('evolution-'))
    );

    const key = 'poipoi:evolution:pc-applied';
    const saved = await scopedEvolutionStorage.getItem(key);

    let applied: Record<string, number> = {};
    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          applied = Object.fromEntries(
            Object.entries(parsed).filter(([id, time]) =>
              (id.startsWith('evolution_run_') || id.startsWith('evolution-')) &&
              typeof time === 'number' && Number.isFinite(time)
            )
          );
        }
      } catch {
        // Damaged import markers must not prevent recovering verified PC history.
      }
    }

    let imported = 0;
    let skipped = 0;

    for (const record of pcRecords) {
      if (applied[record.id] === record.updatedAt) {
        skipped++;
        continue;
      }

      let result: unknown;

      try {
        result = JSON.parse(record.value);
      } catch {
        skipped++;
        continue;
      }

      if (!result || typeof result !== 'object') {
        skipped++;
        continue;
      }

      const run = result as Record<string, unknown>;

      if (run.outcome !== 'executed' && !(run.success === true && run.tested === true)) {
        skipped++;
        continue;
      }

      await scopedEvolutionStorage.setItem(
        'poipoi:evolution:pc-result:' + record.id,
        record.value
      );

      applied[record.id] = record.updatedAt;
      imported++;
    }

    await scopedEvolutionStorage.setItem(key, JSON.stringify(applied));

    return { imported, skipped };
  }
  static async getPcEvolutionSummary(): Promise<{
    totalRuns: number;
    executedRuns: number;
    errorRuns: number;
    totalChangesApplied: number;
    totalRollbacks: number;
    latestResult: unknown | null;
  }> {
    const results = await this.getPcEvolutionResultsFromUnifiedState();

    let executedRuns = 0;
    let errorRuns = 0;
    let totalChangesApplied = 0;
    let totalRollbacks = 0;

    for (const result of results) {
      if (!result || typeof result !== 'object') continue;

      const run = result as Record<string, unknown>;

      if (run.outcome === 'executed' || (run.success === true && run.tested === true)) executedRuns++;
      if (run.outcome === 'error' || run.success === false) errorRuns++;

      if (
        typeof run.changesApplied === 'number' &&
        Number.isFinite(run.changesApplied)
      ) {
        totalChangesApplied += run.changesApplied;
      }

      if (
        typeof run.rollbacks === 'number' &&
        Number.isFinite(run.rollbacks)
      ) {
        totalRollbacks += run.rollbacks;
      }
    }

    return {
      totalRuns: results.length,
      executedRuns,
      errorRuns,
      totalChangesApplied,
      totalRollbacks,
      latestResult: results[0] ?? null,
    };
  }
  static async getLatestPcEvolutionResult(): Promise<unknown | null> {
    const results = await this.getPcEvolutionResultsFromUnifiedState();
    return results.length > 0 ? results[0] : null;
  }
  static async getPcEvolutionHistory(limit = 20): Promise<unknown[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      throw new Error('取得件数が不正です');
    }

    const results = await this.getPcEvolutionResultsFromUnifiedState();
    return results.slice(0, limit);
  }
  static async restoreEvolutionFromUnifiedState(): Promise<boolean> {
    const state = await getMobilePoiPoiState();
    const snapshot = state.records.find(record =>
      record.category === 'evolution' &&
      record.id === 'mobile_evolution_snapshot' &&
      record.origin === 'android'
    );

    if (!snapshot) {
      return false;
    }

    const current = await this.exportEvolutionData();
    const incoming = JSON.parse(snapshot.value);

    if (
      !incoming ||
      incoming.version !== 1 ||
      !Array.isArray(incoming.proposals) ||
      !Array.isArray(incoming.active) ||
      !Array.isArray(incoming.designs)
    ) {
      throw new Error('同期済み自己進化データが不正です');
    }

    const existing = JSON.parse(current);
    if (
      existing.proposals.length > 0 ||
      existing.active.length > 0 ||
      existing.designs.some((design: unknown) => design !== null)
    ) {
      return false;
    }

    await this.importEvolutionDataExclusive(snapshot.value);
    return true;
  }
  static async importEvolutionData(json: string): Promise<void> {
    if (
      typeof json !== 'string' ||
      json.length === 0 ||
      json.length > 5_000_000
    ) {
      throw new Error('バックアップデータのサイズが不正です');
    }
    const data: unknown = JSON.parse(json);

    if (!data || typeof data !== 'object') {
      throw new Error('自己進化データが不正です');
    }

    const value = data as Record<string, unknown>;

    if (
      value.version !== 1 ||
      !Array.isArray(value.proposals) ||
      !Array.isArray(value.active) ||
      !Array.isArray(value.designs) ||
      value.designs.length !== value.proposals.length
    ) {
      throw new Error('対応していない自己進化データです');
    }

    const proposals = value.proposals;

    if (!proposals.every(item =>
      item &&
      typeof item.request === 'string' &&
      typeof item.proposal === 'string' &&
      (item.status === 'pending' || item.status === 'approved')
    )) {
      throw new Error('提案データが不正です');
    }

    if (!value.designs.every(item =>
      item === null || typeof item === 'string'
    )) {
      throw new Error('設計データが不正です');
    }

    const designs = value.designs as Array<string | null>;
    if (!value.active.every(item =>
      Number.isInteger(item) &&
      item >= 0 &&
      item < proposals.length &&
      proposals[item].status === 'approved' &&
      typeof designs[item] === 'string' &&
      (designs[item] as string).length > 0
    )) {
      throw new Error('有効化データが不正です');
    }

    const keys = [
      'poipoi:evolution:proposals',
      'poipoi:evolution:active',
      ...proposals.map((_, index) => 'poipoi:evolution:design:' + index)
    ];

    const existing = await scopedEvolutionStorage.multiGet(keys);
    const existingMap = new Map(existing);
    const updates: [string, string][] = [
      ['poipoi:evolution:proposals', JSON.stringify(proposals)],
      ['poipoi:evolution:active', JSON.stringify(value.active)]
    ];

    value.designs.forEach((design, index) => {
      if (typeof design === 'string') {
        updates.push(['poipoi:evolution:design:' + index, design]);
      }
    });

    try {
      await scopedEvolutionStorage.multiSet(updates);
      const missingDesignKeys = value.designs
        .map((design, index) =>
          design === null ? 'poipoi:evolution:design:' + index : null
        )
        .filter((key): key is string => key !== null);

      if (missingDesignKeys.length) {
        await scopedEvolutionStorage.multiRemove(missingDesignKeys);
      }
    } catch (error) {
      await scopedEvolutionStorage.multiSet(
        existing.filter((entry): entry is [string, string] =>
          entry[1] !== null
        )
      );
      await scopedEvolutionStorage.multiRemove(
        existing.filter(entry => entry[1] === null).map(entry => entry[0])
      );
      throw error;
    }
  }
  static approve(feature: FeatureProposal): FeatureProposal {
    return { ...feature, status: 'approved' };
  }
}
