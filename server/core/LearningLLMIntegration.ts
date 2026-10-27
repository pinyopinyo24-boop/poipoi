import { invokeLLM } from "../_core/llm";
import { enrichPromptWithLearning } from "./LearningContextIntegration";

type LLMRequest = Parameters<typeof invokeLLM>[0];
type LLMResponse = Awaited<ReturnType<typeof invokeLLM>>;

export async function invokeLearningLLM(
  request: LLMRequest
): Promise<LLMResponse> {
  const messages = request.messages;

  const lastUserIndex = messages
    .map((message, index) => ({ message, index }))
    .filter(item => item.message.role === "user")
    .map(item => item.index)
    .pop();

  if (lastUserIndex === undefined) {
    return invokeLLM(request);
  }

  const original = messages[lastUserIndex];
  const content = original.content;

  if (typeof content !== "string") {
    return invokeLLM(request);
  }

  const enriched = await enrichPromptWithLearning(
    process.cwd(),
    content
  );

  const updatedMessages = messages.map((message, index) =>
    index === lastUserIndex
      ? { ...message, content: enriched }
      : message
  );

  return invokeLLM({
    ...request,
    messages: updatedMessages
  } as LLMRequest);
}
