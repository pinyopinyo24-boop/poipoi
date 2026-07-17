/**
 * Test Engine for PoiPoi AI
 * Simple testing framework
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

  /**
   * Run a test
   */
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
        error: error instanceof Error ? error.message : String(error),
        time: Date.now() - start,
        date: new Date().toISOString(),
      };

      this.results.push(result);
      return result;
    }
  }

  /**
   * Get all test results
   */
  getResults(): TestResult[] {
    return this.results;
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.results.length === 0) return 0;

    const pass = this.results.filter((r) => r.status === "PASS").length;

    return (pass / this.results.length) * 100;
  }

  /**
   * Get failed tests
   */
  getFailedTests(): TestResult[] {
    return this.results.filter((r) => r.status === "FAIL");
  }

  /**
   * Clear results
   */
  clear(): void {
    this.results = [];
  }
}

export default TestEngine;
