import AsyncStorage from '@react-native-async-storage/async-storage';
import { AndroidLocalAI } from './AndroidLocalAI';

export type FeatureProposal = {
  request: string;
  proposal: string;
  status: 'pending' | 'approved';
};

export class MobileSelfEvolution {
  static async getProposals(): Promise<FeatureProposal[]> {
    const saved = await AsyncStorage.getItem('poipoi:evolution:proposals');
    return saved ? JSON.parse(saved) as FeatureProposal[] : [];
  }
  static async propose(request: string): Promise<FeatureProposal> {
    const proposal = await AndroidLocalAI.sendMessage(
      `次の機能追加要求について、実装方針・必要な処理・安全上の注意を日本語で提案してください。まだ実行しないでください。\n${request}`
    );

    const feature: FeatureProposal = { request, proposal, status: 'pending' };
    const key = 'poipoi:evolution:proposals';
    const saved = await AsyncStorage.getItem(key);
    const history: FeatureProposal[] = saved ? JSON.parse(saved) : [];
    history.push(feature);
    await AsyncStorage.setItem(key, JSON.stringify(history));
    return feature;
  }

  static async approveAndSave(index: number): Promise<FeatureProposal> {
    const history = await this.getProposals();
    if (!Number.isInteger(index) || index < 0 || index >= history.length) {
      throw new Error('提案が見つかりません');
    }
    const approved = this.approve(history[index]);
    history[index] = approved;
    await AsyncStorage.setItem('poipoi:evolution:proposals', JSON.stringify(history));
    return approved;
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
    await AsyncStorage.setItem('poipoi:evolution:design:' + index, design);
    return design;
  }
  static async getFeatureDesign(index: number): Promise<string> {
    const history = await this.getProposals();
    if (!Number.isInteger(index) || index < 0 || index >= history.length) {
      throw new Error('提案が見つかりません');
    }
    return await AsyncStorage.getItem('poipoi:evolution:design:' + index)
      || '設計はまだ生成されていません';
  }
  static async activateFeature(index: number): Promise<string> {
    const history = await this.getProposals();
    const feature = history[index];
    if (!feature || feature.status !== 'approved') {
      throw new Error('承認済みの提案がありません');
    }

    const design = await AsyncStorage.getItem('poipoi:evolution:design:' + index);
    if (!design) {
      throw new Error('先に設計を生成してください');
    }

    const key = 'poipoi:evolution:active';
    const saved = await AsyncStorage.getItem(key);
    const active: number[] = saved ? JSON.parse(saved) : [];

    if (!active.includes(index)) {
      active.push(index);
      await AsyncStorage.setItem(key, JSON.stringify(active));
    }

    return '拡張機能を登録しました: ' + feature.request;
  }
  static async getActiveFeatures(): Promise<string> {
    const saved = await AsyncStorage.getItem('poipoi:evolution:active');
    const active: number[] = saved ? JSON.parse(saved) : [];
    const history = await this.getProposals();

    if (!active.length) return '登録済み機能はありません';

    return active.map(i =>
      (i + 1) + '. ' + (history[i]?.request || '不明な機能')
    ).join('\n');
  }
  static async deactivateFeature(index: number): Promise<string> {
    const history = await this.getProposals();
    if (!Number.isInteger(index) || index < 0 || index >= history.length) {
      throw new Error('提案が見つかりません');
    }

    const key = 'poipoi:evolution:active';
    const saved = await AsyncStorage.getItem(key);
    const active: number[] = saved ? JSON.parse(saved) : [];

    if (!active.includes(index)) {
      return 'この機能は登録されていません';
    }

    await AsyncStorage.setItem(
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

    const saved = await AsyncStorage.getItem('poipoi:evolution:active');
    const active: number[] = saved ? JSON.parse(saved) : [];
    const design = await AsyncStorage.getItem('poipoi:evolution:design:' + index);

    return [
      '機能: ' + history[index].request,
      '承認: ' + (history[index].status === 'approved' ? '済み' : '未承認'),
      '設計: ' + (design ? '保存済み' : '未作成'),
      '登録: ' + (active.includes(index) ? '有効' : '無効'),
      '実行: 未実装'
    ].join('\n');
  }
  static async executeFeature(index: number, input: string): Promise<string> {
    const history = await this.getProposals();
    if (!Number.isInteger(index) || index < 0 || index >= history.length) {
      throw new Error('提案が見つかりません');
    }
    if (history[index].status !== 'approved') {
      throw new Error('未承認の機能です');
    }

    const saved = await AsyncStorage.getItem('poipoi:evolution:active');
    const active: number[] = saved ? JSON.parse(saved) : [];
    if (!active.includes(index)) {
      throw new Error('登録されていない機能です');
    }

    const design = await AsyncStorage.getItem('poipoi:evolution:design:' + index);
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
  static approve(feature: FeatureProposal): FeatureProposal {
    return { ...feature, status: 'approved' };
  }
}
