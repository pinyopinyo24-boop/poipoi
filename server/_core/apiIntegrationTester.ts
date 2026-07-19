export interface APITestRequest {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface APITestResult {
  success: boolean;
  statusCode?: number;
  responseTime: number;
  response?: any;
  error?: string;
  timestamp: Date;
}

export class APIIntegrationTester {
  /**
   * Test a single API endpoint
   */
  async testEndpoint(request: APITestRequest): Promise<APITestResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), request.timeout || 5000);

      const response = await fetch(request.endpoint, {
        method: request.method,
        headers: {
          "Content-Type": "application/json",
          ...request.headers,
        },
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      let responseData: any;

      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }

      return {
        success: response.ok,
        statusCode: response.status,
        responseTime,
        response: responseData,
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test multiple endpoints in parallel
   */
  async testMultipleEndpoints(requests: APITestRequest[]): Promise<APITestResult[]> {
    const promises = requests.map((req) => this.testEndpoint(req));
    return Promise.all(promises);
  }

  /**
   * Test endpoint with retry logic
   */
  async testEndpointWithRetry(
    request: APITestRequest,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<APITestResult> {
    let lastError: APITestResult | null = null;

    for (let i = 0; i < maxRetries; i++) {
      const result = await this.testEndpoint(request);

      if (result.success) {
        return result;
      }

      lastError = result;

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, i)));
      }
    }

    return lastError || { success: false, responseTime: 0, error: "Unknown error", timestamp: new Date() };
  }

  /**
   * Test endpoint health
   */
  async testEndpointHealth(endpoint: string): Promise<{
    isHealthy: boolean;
    responseTime: number;
    statusCode?: number;
  }> {
    const result = await this.testEndpoint({
      endpoint,
      method: "GET",
      timeout: 3000,
    });

    return {
      isHealthy: result.success && (result.statusCode === 200 || result.statusCode === 204),
      responseTime: result.responseTime,
      statusCode: result.statusCode,
    };
  }

  /**
   * Test endpoint performance
   */
  async testEndpointPerformance(
    endpoint: string,
    iterations: number = 10
  ): Promise<{
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    successRate: number;
  }> {
    const results = await this.testMultipleEndpoints(
      Array(iterations).fill({ endpoint, method: "GET" as const })
    );

    const responseTimes = results.map((r) => r.responseTime);
    const successCount = results.filter((r) => r.success).length;

    return {
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      successRate: successCount / iterations,
    };
  }

  /**
   * Test GraphQL endpoint
   */
  async testGraphQLEndpoint(
    endpoint: string,
    query: string,
    variables?: Record<string, any>
  ): Promise<APITestResult> {
    return this.testEndpoint({
      endpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        query,
        variables,
      },
    });
  }

  /**
   * Test REST API with authentication
   */
  async testAuthenticatedEndpoint(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    token: string,
    body?: any
  ): Promise<APITestResult> {
    return this.testEndpoint({
      endpoint,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body,
    });
  }

  /**
   * Test endpoint rate limiting
   */
  async testRateLimiting(
    endpoint: string,
    requestsPerSecond: number = 10,
    durationSeconds: number = 5
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    rateLimitedRequests: number;
    averageResponseTime: number;
  }> {
    const results: APITestResult[] = [];
    const requestInterval = 1000 / requestsPerSecond;
    const endTime = Date.now() + durationSeconds * 1000;

    while (Date.now() < endTime) {
      const result = await this.testEndpoint({
        endpoint,
        method: "GET",
      });
      results.push(result);
      await new Promise((resolve) => setTimeout(resolve, requestInterval));
    }

    const rateLimitedRequests = results.filter((r) => r.statusCode === 429).length;
    const successfulRequests = results.filter((r) => r.success).length;

    return {
      totalRequests: results.length,
      successfulRequests,
      rateLimitedRequests,
      averageResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0) / results.length,
    };
  }

  /**
   * Test endpoint with different payloads
   */
  async testWithVariousPayloads(
    endpoint: string,
    payloads: any[]
  ): Promise<Array<{ payload: any; result: APITestResult }>> {
    const results = await Promise.all(
      payloads.map(async (payload) => ({
        payload,
        result: await this.testEndpoint({
          endpoint,
          method: "POST",
          body: payload,
        }),
      }))
    );

    return results;
  }

  /**
   * Generate test report
   */
  generateTestReport(results: APITestResult[]): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
  } {
    const passedTests = results.filter((r) => r.success).length;
    const failedTests = results.length - passedTests;
    const responseTimes = results.map((r) => r.responseTime);

    return {
      totalTests: results.length,
      passedTests,
      failedTests,
      successRate: (passedTests / results.length) * 100,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
    };
  }
}

// Export singleton instance
export const apiTester = new APIIntegrationTester();
