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

  it("counts messages with overhead", () => {
    const fromText = countHeuristic({ text: "Hello" });
    const fromMessages = countHeuristic({
      messages: [{ role: "user", content: "Hello" }],
    });
    expect(fromMessages).toBeGreaterThanOrEqual(fromText);
  });

  it("includes system in count", () => {
    const without = countHeuristic({
      messages: [{ role: "user", content: "Hi" }],
    });
    const withSystem = countHeuristic({
      messages: [{ role: "user", content: "Hi" }],
      system: "You are helpful.",
    });
    expect(withSystem).toBeGreaterThan(without);
  });

  it("hoists system messages into the system prompt", () => {
    const inlineSystem = countHeuristic({
      messages: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "Hi" },
      ],
    });
    const topLevelSystem = countHeuristic({
      messages: [{ role: "user", content: "Hi" }],
      system: "You are helpful.",
    });
    expect(inlineSystem).toBe(topLevelSystem);
  });

  it("scales with longer input", () => {
    const short = countHeuristic({ text: "a" });
    const long = countHeuristic({ text: "a".repeat(400) });
    expect(long).toBeGreaterThan(short);
  });

  it("can exclude assistant tool parts from local counting", () => {
    const withTools = countHeuristic({
      messages: [
        {
          role: "assistant",
          parts: [
            { type: "text", text: "Calling tool with detailed params." },
            {
              type: "tool_call",
              id: "call_1",
              name: "get_weather",
              arguments:
                "{\"city\":\"Paris\",\"units\":\"celsius\",\"includeForecast\":true,\"days\":7}",
            },
          ],
        },
      ],
      countAssistantTools: true,
    });

    const withoutTools = countHeuristic({
      messages: [
        {
          role: "assistant",
          parts: [
            { type: "text", text: "Calling tool with detailed params." },
            {
              type: "tool_call",
              id: "call_1",
              name: "get_weather",
              arguments:
                "{\"city\":\"Paris\",\"units\":\"celsius\",\"includeForecast\":true,\"days\":7}",
            },
          ],
        },
      ],
      countAssistantTools: false,
    });

    expect(withoutTools).toBeLessThan(withTools);
  });
});
