import { describe, expect, it } from "vitest";
import { calculatePrice } from "../../src/calculate-price.js";

describe("calculatePrice", () => {
  it("returns usd for known model", () => {
    const price = calculatePrice({
      provider: "openai",
      model: "gpt-4o",
      tokens: 1_000_000,
    });
    expect(price).toEqual({ usd: 2.5 });
  });

  it("returns null for unknown model", () => {
    const price = calculatePrice({
      provider: "openai",
      model: "unknown-model-xyz",
      tokens: 100,
    });
    expect(price).toBeNull();
  });

  it("scales linearly with tokens", () => {
    const half = calculatePrice({
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      tokens: 500_000,
    });
    const full = calculatePrice({
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      tokens: 1_000_000,
    });
    expect(half!.usd * 2).toBeCloseTo(full!.usd);
  });
});
