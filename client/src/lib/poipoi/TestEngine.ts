/**
 * Test Engine - PoiPoi AI Core
 * 自動テスト実行
 */

export interface TestResult {
  name: string;
  status: "PASS" | "FAIL";
  time: number;
  date: string;
  error?: string;
}

class TestEngine {
  private results: TestResult[] = [];

  run(name: string, testFunction: () => void): TestResult {
    const start = Date.now();

    try {
      testFunction();

      const result: TestResult = {
        name,
        status: "PASS",
        time: Date.now() - start,
        date: new Date().toISOString(),
      };

      this.results.push(result);
      return result;
    } catch (error) {
      const result: TestResult = {
        name,
        status: "FAIL",
        error: error instanceof Error ? error.message : "Unknown error",
        time: Date.now() - start,
        date: new Date().toISOString(),
      };

      this.results.push(result);
      return result;
    }
  }

  getResults(): TestResult[] {
    return [...this.results];
  }

  getSuccessRate(): number {
    if (this.results.length === 0) return 0;

    const pass = this.results.filter((r) => r.status === "PASS").length;

    return (pass / this.results.length) * 100;
  }

  getFailedTests(): TestResult[] {
    return this.results.filter((r) => r.status === "FAIL");
  }

  clear(): void {
    this.results = [];
  }
}

export default TestEngine;
