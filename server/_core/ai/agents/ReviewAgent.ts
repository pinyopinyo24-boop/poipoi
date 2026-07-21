/**
 * ReviewAgent - Handles review and quality assurance tasks
 * Responsible for code review, testing, and quality checks
 */

import { BaseAgent, AgentContext } from './BaseAgent';
import { IAIProvider, AIMessage, AIInvokeOptions } from '../providers/AIProvider';

export class ReviewAgent extends BaseAgent {
  constructor(provider: IAIProvider) {
    const systemPrompt = `You are a Review Agent for PoiPoi OS. Your role is to:
1. Perform comprehensive code reviews
2. Check code quality, security, and performance
3. Verify compliance with standards and best practices
4. Identify bugs, vulnerabilities, and improvements
5. Provide actionable feedback and recommendations

Provide detailed review with:
- Code quality assessment
- Security vulnerabilities
- Performance issues
- Best practice violations
- Test coverage analysis
- Refactoring suggestions
- Risk assessment

Format your response as JSON with the following structure:
{
  "reviewType": "code|design|security|performance|test",
  "title": "Review title",
  "summary": "Executive summary",
  "findings": [...],
  "issues": {
    "critical": [...],
    "major": [...],
    "minor": [...]
  },
  "securityVulnerabilities": [...],
  "performanceIssues": [...],
  "suggestions": [...],
  "score": {
    "quality": 0-100,
    "security": 0-100,
    "performance": 0-100,
    "testCoverage": 0-100
  },
  "recommendations": [...],
  "approved": true|false
}`;

    super('review', provider, systemPrompt);
  }

  getName(): string {
    return 'Review Agent';
  }

  getDescription(): string {
    return 'Handles review and quality assurance tasks including code review and testing';
  }

  protected getInvokeOptions(): AIInvokeOptions {
    return {
      temperature: 0.5, // Balanced for analytical review
      maxTokens: 4096,
      topP: 0.9,
    };
  }

  protected buildMessages(
    description: string,
    input: Record<string, any>,
    context?: AgentContext
  ): AIMessage[] {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: this.systemPrompt,
      },
      {
        role: 'user',
        content: this.formatReviewRequest(description, input, context),
      },
    ];

    return messages;
  }

  private formatReviewRequest(
    description: string,
    input: Record<string, any>,
    context?: AgentContext
  ): string {
    let message = `Review Request: ${description}\n\n`;

    if (input.code) {
      message += `Code to Review:\n\`\`\`\n${input.code}\n\`\`\`\n\n`;
    }

    if (input.design) {
      message += `Design Reference:\n${JSON.stringify(input.design, null, 2)}\n\n`;
    }

    if (input.requirements) {
      message += `Requirements:\n${JSON.stringify(input.requirements, null, 2)}\n\n`;
    }

    if (input.standards) {
      message += `Standards to Check:\n${JSON.stringify(input.standards, null, 2)}\n\n`;
    }

    if (context?.previousResults?.implementation) {
      message += `Implementation Details:\n${JSON.stringify(context.previousResults.implementation, null, 2)}\n\n`;
    }

    message += `Please provide a comprehensive review with detailed findings, issues, and recommendations.`;

    return message;
  }

  protected processResponse(aiResponse: any, input: Record<string, any>): Record<string, any> {
    try {
      const jsonMatch = aiResponse.content.match(/\\{[\\s\\S]*\\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          rawContent: aiResponse.content,
          model: aiResponse.model,
          provider: aiResponse.provider,
          timestamp: aiResponse.timestamp,
        };
      }
    } catch (error) {
      // Fall back to text response
    }

    return {
      content: aiResponse.content,
      model: aiResponse.model,
      provider: aiResponse.provider,
      timestamp: aiResponse.timestamp,
      parseError: 'Could not parse JSON response',
    };
  }
}
