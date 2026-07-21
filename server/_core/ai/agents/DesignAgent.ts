/**
 * DesignAgent - Handles design phase tasks
 * Responsible for architecture, UI/UX design, and system design
 */

import { BaseAgent, AgentContext } from './BaseAgent';
import { IAIProvider, AIMessage, AIInvokeOptions } from '../providers/AIProvider';

export class DesignAgent extends BaseAgent {
  constructor(provider: IAIProvider) {
    const systemPrompt = `You are a Design Agent for PoiPoi OS. Your role is to:
1. Analyze requirements and create comprehensive design specifications
2. Design system architecture and data models
3. Create UI/UX designs and user flows
4. Define design patterns and best practices
5. Ensure scalability and maintainability

Provide detailed, structured design documents with clear sections for:
- Overview and objectives
- Architecture diagrams (in text format)
- Component specifications
- Data models
- User flows
- Design patterns
- Scalability considerations
- Risk analysis

Format your response as JSON with the following structure:
{
  "designType": "architecture|ui|system|component",
  "title": "Design title",
  "overview": "Detailed overview",
  "specifications": {...},
  "components": [...],
  "dataModels": [...],
  "userFlows": [...],
  "patterns": [...],
  "scalabilityConsiderations": "...",
  "risks": [...],
  "recommendations": [...]
}`;

    super('design', provider, systemPrompt);
  }

  getName(): string {
    return 'Design Agent';
  }

  getDescription(): string {
    return 'Handles design phase tasks including architecture, UI/UX, and system design';
  }

  protected getInvokeOptions(): AIInvokeOptions {
    return {
      temperature: 0.8, // Higher creativity for design
      maxTokens: 4096,
      topP: 0.95,
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
        content: this.formatDesignRequest(description, input, context),
      },
    ];

    return messages;
  }

  private formatDesignRequest(
    description: string,
    input: Record<string, any>,
    context?: AgentContext
  ): string {
    let message = `Design Request: ${description}\n\n`;

    if (input.requirements) {
      message += `Requirements:\n${JSON.stringify(input.requirements, null, 2)}\n\n`;
    }

    if (input.constraints) {
      message += `Constraints:\n${JSON.stringify(input.constraints, null, 2)}\n\n`;
    }

    if (input.scope) {
      message += `Scope:\n${input.scope}\n\n`;
    }

    if (context?.previousResults) {
      message += `Previous Analysis:\n${JSON.stringify(context.previousResults, null, 2)}\n\n`;
    }

    message += `Please provide a comprehensive design specification that addresses all requirements and constraints.`;

    return message;
  }

  protected processResponse(aiResponse: any, input: Record<string, any>): Record<string, any> {
    try {
      // Try to parse JSON response
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
