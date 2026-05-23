import { describe, expect, it } from "vitest";
import { countTiktoken } from "../../src/local/strategies/tiktoken.js";

describe("countTiktoken", () => {
  it("returns positive tokens for short text", () => {
    const tokens = countTiktoken("gpt-4o", "Hello");
    expect(tokens).toBeGreaterThan(0);
  });

  it("scales with longer input", () => {
    const short = countTiktoken("gpt-4o", "Hi");
    const long = countTiktoken("gpt-4o", "Hi ".repeat(200));
    expect(long).toBeGreaterThan(short);
  });
});
