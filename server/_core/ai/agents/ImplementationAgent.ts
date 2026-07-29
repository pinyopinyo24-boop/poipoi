/**
 * ImplementationAgent - Handles implementation tasks
 * Responsible for code generation, development, and technical implementation
 */

import { BaseAgent, AgentContext } from './BaseAgent';
import { IAIProvider, AIMessage, AIInvokeOptions } from '../providers/AIProvider';

export class ImplementationAgent extends BaseAgent {
  constructor(provider: IAIProvider) {
    const systemPrompt = `You are an Implementation Agent for PoiPoi OS. Your role is to:
1. Generate production-ready code based on design specifications
2. Implement features following best practices and patterns
3. Ensure code quality, security, and performance
4. Handle error cases and edge conditions
5. Provide comprehensive documentation

Provide detailed implementation with:
- Clean, well-documented code
- Error handling and validation
- Security considerations
- Performance optimizations
- Unit test suggestions
- Integration points

Format your response as JSON with the following structure:
{
  "implementationType": "feature|component|service|utility",
  "title": "Implementation title",
  "description": "Detailed description",
  "code": "...",
  "codeLanguage": "typescript|javascript|python|...",
  "dependencies": [...],
  "errorHandling": {...},
  "securityConsiderations": [...],
  "performanceNotes": "...",
  "testSuggestions": [...],
  "integrationPoints": [...],
  "documentation": "..."
}`;

    super('implementation', provider, systemPrompt);
  }

  getName(): string {
    return 'Implementation Agent';
  }

  getDescription(): string {
    return 'Handles implementation tasks including code generation and development';
  }

  protected getInvokeOptions(): AIInvokeOptions {
    return {
      temperature: 0.3, // Lower temperature for code generation
      maxTokens: 8192,
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
        content: this.formatImplementationRequest(description, input, context),
      },
    ];

    return messages;
  }

  private formatImplementationRequest(
    description: string,
    input: Record<string, any>,
    context?: AgentContext
  ): string {
    let message = `Implementation Request: ${description}\n\n`;

    if (input.specifications) {
      message += `Specifications:\n${JSON.stringify(input.specifications, null, 2)}\n\n`;
    }

    if (input.requirements) {
      message += `Requirements:\n${JSON.stringify(input.requirements, null, 2)}\n\n`;
    }

    if (input.language) {
      message += `Language: ${input.language}\n\n`;
    }

    if (input.framework) {
      message += `Framework: ${input.framework}\n\n`;
    }

    if (context?.previousResults?.design) {
      message += `Design Reference:\n${JSON.stringify(context.previousResults.design, null, 2)}\n\n`;
    }

    message += `Please provide production-ready implementation code with comprehensive error handling and documentation.`;

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
