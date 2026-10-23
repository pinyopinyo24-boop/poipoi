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
  static approve(feature: FeatureProposal): FeatureProposal {
    return { ...feature, status: 'approved' };
  }
}
