/**
 * ProblemDecompositionService - 問題分解エンジン
 * 複雑な問題を小さな部分問題に分解
 */

export interface DecomposedProblem {
  mainProblem: string;
  subProblems: string[];
  dependencies: Array<{ from: number; to: number }>;
  priority: number[];
}

export class ProblemDecompositionService {
  /**
   * 問題を分解
   */
  async decomposeProblem(
    problem: string,
    constraints: string[]
  ): Promise<string[]> {
    const subProblems: string[] = [];

    // キーワード抽出
    const keywords = this.extractKeywords(problem);

    // 制約条件を考慮
    for (const keyword of keywords) {
      const subProblem = `Solve: ${keyword}`;
      if (this.isValidSubProblem(subProblem, constraints)) {
        subProblems.push(subProblem);
      }
    }

    // 最小限の部分問題を生成
    if (subProblems.length === 0) {
      subProblems.push(problem);
    }

    return subProblems;
  }

  /**
   * 問題構造を分析
   */
  async analyzeStructure(problem: string): Promise<DecomposedProblem> {
    const subProblems = await this.decomposeProblem(problem, []);

    return {
      mainProblem: problem,
      subProblems,
      dependencies: this.analyzeDependencies(subProblems),
      priority: this.calculatePriority(subProblems),
    };
  }

  /**
   * キーワードを抽出
   */
  private extractKeywords(text: string): string[] {
    const words = text.split(/\s+/);
    const keywords: string[] = [];

    for (const word of words) {
      if (word.length > 4 && !this.isStopWord(word)) {
        keywords.push(word);
      }
    }

    return keywords;
  }

  /**
   * ストップワード判定
   */
  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'and', 'or', 'but', 'is', 'are', 'was', 'were'];
    return stopWords.includes(word.toLowerCase());
  }

  /**
   * 部分問題の妥当性を検証
   */
  private isValidSubProblem(subProblem: string, constraints: string[]): boolean {
    if (subProblem.length === 0) return false;

    for (const constraint of constraints) {
      if (subProblem.includes(constraint)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 部分問題間の依存関係を分析
   */
  private analyzeDependencies(
    subProblems: string[]
  ): Array<{ from: number; to: number }> {
    const dependencies: Array<{ from: number; to: number }> = [];

    for (let i = 0; i < subProblems.length; i++) {
      for (let j = i + 1; j < subProblems.length; j++) {
        if (this.hasDependency(subProblems[i], subProblems[j])) {
          dependencies.push({ from: i, to: j });
        }
      }
    }

    return dependencies;
  }

  /**
   * 依存関係を判定
   */
  private hasDependency(problem1: string, problem2: string): boolean {
    // 簡単な依存関係判定
    const words1 = problem1.split(/\s+/);
    const words2 = problem2.split(/\s+/);

    for (const word of words1) {
      if (words2.includes(word)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 優先度を計算
   */
  private calculatePriority(subProblems: string[]): number[] {
    return subProblems.map((problem) => {
      // 問題の複雑さに基づいて優先度を計算
      const complexity = problem.split(/\s+/).length;
      return Math.min(complexity, 10);
    });
  }

  /**
   * 分解の妥当性を検証
   */
  async validateDecomposition(decomposed: DecomposedProblem): Promise<boolean> {
    if (decomposed.subProblems.length === 0) return false;
    if (decomposed.subProblems.length > 20) return false;
    if (decomposed.priority.length !== decomposed.subProblems.length) return false;

    return true;
  }
}
