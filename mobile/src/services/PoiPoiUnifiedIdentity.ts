export const POIPOI_UNIFIED_IDENTITY = {
  name: 'PoiPoi',
  displayName: 'ポイポイAI',
  platform: 'PC / Android',
  sharedIdentity: true,
  localFirst: true,
  pcProvider: 'Ollama',
  mobileProvider: 'AndroidLocalAI',
  conversationSync: true,
  memorySync: true,
  selfLearningSync: true,
  selfEvolutionSync: true,
} as const;