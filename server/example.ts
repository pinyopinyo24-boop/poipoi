// Poipoi self-evolution example
// 実際の自己進化処理は server/core/PoipoiSelfEvolution.ts を使用します。

import { poipoiSelfEvolution } from "./core/PoipoiSelfEvolution";

export async function runSelfEvolutionExample(task: string) {
  return poipoiSelfEvolution.run(task);
}
