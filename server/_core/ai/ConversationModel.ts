const cache = new Map<string, { at: number; model: string }>();
/** Respect an explicit conversation model; otherwise prefer an installed general-language model. */
export async function conversationModel(apiUrl = process.env.LOCAL_AI_URL || 'http://localhost:11434') {
  const configured = process.env.LOCAL_CHAT_MODEL?.trim();
  if (configured) return configured;
  const base = apiUrl.trim().replace(/\/+$/, ''), cached = cache.get(base);
  if (cached && Date.now() - cached.at < 60000) return cached.model;
  const fallback = process.env.LOCAL_CODER_MODEL?.trim() || 'qwen2.5-coder:7b';
  try {
    const response = await fetch(base + '/api/tags', { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return fallback;
    const data = await response.json() as { models?: Array<{ name?: string }> };
    const installed = new Set((data.models ?? []).map(item => item.name).filter((name): name is string => typeof name === 'string'));
    const model = ['qwen2.5:7b', 'qwen2.5:7b-instruct', fallback].find(name => installed.has(name)) ?? fallback;
    if (cache.size > 32) cache.clear();
    cache.set(base, { at: Date.now(), model }); return model;
  } catch { return fallback; }
}
