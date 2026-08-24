import { PoipoiCodeAgent, CodeTaskResult } from "./PoipoiCodeAgent";

export interface SelfEvolutionRun {
  task: string;
  startedAt: string;
  finishedAt: string;
  result: CodeTaskResult;
}

export class PoipoiSelfEvolution {
  private readonly agent = PoipoiCodeAgent.getInstance();

  async run(task: string): Promise<SelfEvolutionRun> {
    const startedAt = new Date().toISOString();
    const result = await this.agent.execute(task);

    return {
      task,
      startedAt,
      finishedAt: new Date().toISOString(),
      result,
    };
  }
}

export const poipoiSelfEvolution = new PoipoiSelfEvolution();
