# PoiPoi AI Core Architecture

## Overview

AI Core system for PoiPoi OS with multiple provider support and agent coordination.

## Directory Structure

```
server/
├── _core/
│   ├── ai/
│   │   ├── providers/
│   │   │   ├── AIProvider.ts          # Base interface
│   │   │   ├── ChatGPTProvider.ts     # ChatGPT implementation
│   │   │   └── GeminiProvider.ts      # Gemini implementation
│   │   ├── agents/
│   │   │   ├── BaseAgent.ts           # Base agent class
│   │   │   ├── DesignAgent.ts         # Design agent
│   │   │   ├── ImplementationAgent.ts # Implementation agent
│   │   │   ├── ReviewAgent.ts         # Review agent
│   │   │   └── TaskAgent.ts           # Task agent
│   │   ├── AgentManager.ts            # Agent coordination
│   │   └── AICore.ts                  # Main AI core
│   └── llm.ts                         # Existing LLM integration
```

## Key Components

### 1. AIProvider Interface
- Unified interface for multiple AI providers
- Methods: invoke(), getModels(), getStatus()
- Implementations: ChatGPT, Gemini

### 2. Agents
- BaseAgent: Common functionality
- DesignAgent: Design phase tasks
- ImplementationAgent: Implementation tasks
- ReviewAgent: Code review tasks
- TaskAgent: General task execution

### 3. AgentManager
- Manages agent lifecycle
- Coordinates between agents
- Tracks agent status and history

### 4. Integration Points
- tRPC routers for agent invocation
- Dashboard display of agent status
- PoiPoi OS Manager integration

## Implementation Plan

Phase 1: Core interfaces and providers
Phase 2: Agent implementations
Phase 3: AgentManager and coordination
Phase 4: tRPC integration
Phase 5: Dashboard integration
Phase 6: Testing and verification
