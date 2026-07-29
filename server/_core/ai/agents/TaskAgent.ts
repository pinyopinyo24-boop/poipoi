/**
 * TaskAgent - Handles general task execution
 * Responsible for task coordination and general AI operations
 */

import { BaseAgent, AgentContext } from './BaseAgent';
import { IAIProvider, AIMessage, AIInvokeOptions } from '../providers/AIProvider';

export class TaskAgent extends BaseAgent {
  constructor(provider: IAIProvider) {
    const systemPrompt = `You are a Task Agent for PoiPoi OS. Your role is to:
1. Execute general tasks and operations
2. Coordinate between different components
3. Handle data processing and transformation
4. Provide analysis and insights
5. Support decision-making processes

Provide clear, structured responses with:
- Task execution summary
- Results and findings
- Data analysis
- Recommendations
- Next steps

Format your response as JSON with the following structure:
{
  "taskType": "analysis|processing|coordination|reporting|other",
  "title": "Task title",
  "status": "completed|in_progress|pending",
  "results": {...},
  "analysis": "...",
  "insights": [...],
  "recommendations": [...],
  "nextSteps": [...],
  "metadata": {...}
}`;

    super('task', provider, systemPrompt);
  }

  getName(): string {
    return 'Task Agent';
  }

  getDescription(): string {
    return 'Handles general task execution and coordination';
  }

  protected getInvokeOptions(): AIInvokeOptions {
    return {
      temperature: 0.6,
      maxTokens: 2048,
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
        content: this.formatTaskRequest(description, input, context),
      },
    ];

    return messages;
  }

  private formatTaskRequest(
    description: string,
    input: Record<string, any>,
    context?: AgentContext
  ): string {
    let message = `Task: ${description}\n\n`;

    if (Object.keys(input).length > 0) {
      message += `Input Data:\n${JSON.stringify(input, null, 2)}\n\n`;
    }

    if (context?.previousResults) {
      message += `Previous Results:\n${JSON.stringify(context.previousResults, null, 2)}\n\n`;
    }

    if (context?.dependencies && context.dependencies.length > 0) {
      message += `Dependencies: ${context.dependencies.join(', ')}\n\n`;
    }

    message += `Please execute this task and provide detailed results with analysis and recommendations.`;

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
