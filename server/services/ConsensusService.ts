/**
 * ConsensusService - 合意形成エンジン
 */

export interface AgentResponse {
  agentId: string;
  response: Record<string, unknown>;
  confidence: number;
}

export class ConsensusService {
  /**
   * 合意を形成
   */
  async formConsensus(responses: AgentResponse[]): Promise<Record<string, unknown>> {
    if (responses.length === 0) {
      return { consensus: 'No responses', confidence: 0 };
    }

    // 信頼度の高い応答を優先
    const sortedResponses = responses.sort((a, b) => b.confidence - a.confidence);

    const topResponses = sortedResponses.slice(0, Math.ceil(responses.length / 2));

    const avgConfidence =
      topResponses.reduce((sum, r) => sum + r.confidence, 0) / topResponses.length;

    return {
      consensus: 'Consensus formed from top responses',
      agentCount: topResponses.length,
      averageConfidence: avgConfidence,
      agreementLevel: this.calculateAgreementLevel(topResponses),
    };
  }

  /**
   * 合意レベルを計算
   */
  private calculateAgreementLevel(responses: AgentResponse[]): number {
    if (responses.length === 0) return 0;

    const avgConfidence =
      responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;

    return Math.min(avgConfidence, 1);
  }

  /**
   * 矛盾を検出
   */
  async detectContradictions(responses: AgentResponse[]): Promise<string[]> {
    const contradictions: string[] = [];

    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const diff = Math.abs(responses[i].confidence - responses[j].confidence);
        if (diff > 0.3) {
          contradictions.push(
            `Contradiction between ${responses[i].agentId} and ${responses[j].agentId}`
          );
        }
      }
    }

    return contradictions;
  }

  /**
   * 合意品質を評価
   */
  async evaluateConsensusQuality(responses: AgentResponse[]): Promise<number> {
    if (responses.length === 0) return 0;

    const avgConfidence =
      responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;

    const varianceConfidence =
      responses.reduce((sum, r) => sum + Math.pow(r.confidence - avgConfidence, 2), 0) /
      responses.length;

    const standardDeviation = Math.sqrt(varianceConfidence);

    // 標準偏差が小さいほど品質が高い
    return Math.max(0, 1 - standardDeviation);
  }

  /**
   * 投票ベースの合意
   */
  async voteBasedConsensus(
    responses: AgentResponse[]
  ): Promise<Record<string, unknown>> {
    const votes = new Map<string, number>();

    for (const response of responses) {
      const key = JSON.stringify(response.response);
      votes.set(key, (votes.get(key) || 0) + 1);
    }

    let maxVotes = 0;
    let consensusKey = '';

    const entriesIterator = votes.entries();
    let entry = entriesIterator.next();
    while (!entry.done) {
      const key = entry.value[0];
      const count = entry.value[1];
      if (count > maxVotes) {
        maxVotes = count;
        consensusKey = key;
      }
      entry = entriesIterator.next();
    }

    return {
      consensus: consensusKey ? JSON.parse(consensusKey) : {},
      votes: maxVotes,
      totalResponses: responses.length,
      agreementPercentage: (maxVotes / responses.length) * 100,
    };
  }

  /**
   * 重み付き合意
   */
  async weightedConsensus(responses: AgentResponse[]): Promise<Record<string, unknown>> {
    const totalWeight = responses.reduce((sum, r) => sum + r.confidence, 0);

    if (totalWeight === 0) {
      return { consensus: 'No valid responses', confidence: 0 };
    }

    const avgConfidence = totalWeight / responses.length;

    return {
      consensus: 'Weighted consensus formed',
      totalWeight,
      averageConfidence: avgConfidence,
      agentCount: responses.length,
    };
  }
}
