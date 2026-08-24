import { describe, expect, it } from "vitest";
import { PoipoiCodeAgent } from "./PoipoiCodeAgent";

describe("PoipoiCodeAgent smoke", () => {
  it("can be instantiated", () => {
    const agent = PoipoiCodeAgent.getInstance();
    expect(agent).toBeDefined();
  });
});
