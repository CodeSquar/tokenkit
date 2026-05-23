import { describe, expect, it } from "vitest";
import { countHeuristic } from "../../src/local/strategies/heuristic.js";

describe("countHeuristic", () => {
  it("throws for empty text", () => {
    expect(() => countHeuristic({ text: "" })).toThrow();
  });

  it("counts plain text", () => {
    const tokens = countHeuristic({ text: "Hello world" });
    expect(tokens).toBeGreaterThan(0);
  });

  it("scales with longer input", () => {
    const short = countHeuristic({ text: "a" });
    const long = countHeuristic({ text: "a".repeat(400) });
    expect(long).toBeGreaterThan(short);
  });

  it("adds line overhead", () => {
    const oneLine = countHeuristic({ text: "hello world" });
    const threeLines = countHeuristic({ text: "hello\nworld\nagain" });
    expect(threeLines).toBeGreaterThan(oneLine);
  });
});
