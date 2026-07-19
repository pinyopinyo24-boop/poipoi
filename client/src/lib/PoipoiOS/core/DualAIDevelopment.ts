/**
 * Dual AI Development
 * Manus AI と ChatGPT による二人開発
 */

export interface Contribution {
  id: string;
  author: "manus" | "chatgpt";
  type: "code" | "design" | "review" | "suggestion";
  content: string;
  timestamp: string;
  approved: boolean;
}

export interface DevelopmentPhase {
  id: string;
  name: string;
  description: string;
  contributions: Contribution[];
  status: "planning" | "development" | "review" | "complete";
  startedAt: string;
  completedAt?: string;
}

class DualAIDevelopment {
  private phases: Map<string, DevelopmentPhase> = new Map();
  private currentPhase: DevelopmentPhase | null = null;
  private contributions: Contribution[] = [];

  startPhase(name: string, description: string): DevelopmentPhase {
    const phase: DevelopmentPhase = {
      id: `phase_${Date.now()}`,
      name,
      description,
      contributions: [],
      status: "planning",
      startedAt: new Date().toISOString(),
    };

    this.phases.set(phase.id, phase);
    this.currentPhase = phase;

    console.log(`🚀 フェーズ開始: ${name}`);
    console.log(`📝 説明: ${description}`);

    return phase;
  }

  addManusContribution(
    type: "code" | "design" | "review" | "suggestion",
    content: string
  ): Contribution {
    if (!this.currentPhase) {
      throw new Error("アクティブなフェーズがありません");
    }

    const contribution: Contribution = {
      id: `contrib_${Date.now()}_manus`,
      author: "manus",
      type,
      content,
      timestamp: new Date().toISOString(),
      approved: false,
    };

    this.currentPhase.contributions.push(contribution);
    this.contributions.push(contribution);

    console.log(`🤖 Manus が ${type} を追加しました`);

    return contribution;
  }

  addChatGPTContribution(
    type: "code" | "design" | "review" | "suggestion",
    content: string
  ): Contribution {
    if (!this.currentPhase) {
      throw new Error("アクティブなフェーズがありません");
    }

    const contribution: Contribution = {
      id: `contrib_${Date.now()}_chatgpt`,
      author: "chatgpt",
      type,
      content,
      timestamp: new Date().toISOString(),
      approved: false,
    };

    this.currentPhase.contributions.push(contribution);
    this.contributions.push(contribution);

    console.log(`🧠 ChatGPT が ${type} を追加しました`);

    return contribution;
  }

  approveContribution(contributionId: string): boolean {
    const contribution = this.contributions.find((c) => c.id === contributionId);
    if (!contribution) return false;

    contribution.approved = true;

    console.log(`✅ 承認: ${contribution.author} の ${contribution.type}`);

    return true;
  }

  reviewPhase(): {
    manusContributions: number;
    chatgptContributions: number;
    approved: number;
    pending: number;
  } {
    if (!this.currentPhase) {
      return {
        manusContributions: 0,
        chatgptContributions: 0,
        approved: 0,
        pending: 0,
      };
    }

    return {
      manusContributions: this.currentPhase.contributions.filter(
        (c) => c.author === "manus"
      ).length,
      chatgptContributions: this.currentPhase.contributions.filter(
        (c) => c.author === "chatgpt"
      ).length,
      approved: this.currentPhase.contributions.filter(
        (c) => c.approved
      ).length,
      pending: this.currentPhase.contributions.filter(
        (c) => !c.approved
      ).length,
    };
  }

  completePhase(): DevelopmentPhase | null {
    if (!this.currentPhase) return null;

    this.currentPhase.status = "complete";
    this.currentPhase.completedAt = new Date().toISOString();

    const completed = this.currentPhase;
    this.currentPhase = null;

    console.log(`🎉 フェーズ完了: ${completed.name}`);

    return completed;
  }

  getPhases(): DevelopmentPhase[] {
    return Array.from(this.phases.values());
  }

  getStats() {
    return {
      totalPhases: this.phases.size,
      currentPhase: this.currentPhase?.name || "なし",
      totalContributions: this.contributions.length,
      manusContributions: this.contributions.filter(
        (c) => c.author === "manus"
      ).length,
      chatgptContributions: this.contributions.filter(
        (c) => c.author === "chatgpt"
      ).length,
      approvedContributions: this.contributions.filter(
        (c) => c.approved
      ).length,
      pendingContributions: this.contributions.filter(
        (c) => !c.approved
      ).length,
    };
  }
}

export default DualAIDevelopment;
