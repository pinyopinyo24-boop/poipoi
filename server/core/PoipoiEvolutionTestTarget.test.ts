import { describe, expect, it } from "vitest";
import { POIPOI_EVOLUTION_TEST } from "./PoipoiEvolutionTestTarget";

describe("PoipoiEvolutionTestTarget", () => {
  it("should contain the evolved value", () => {
    expect(POIPOI_EVOLUTION_TEST).toBe("after");
  });
});
