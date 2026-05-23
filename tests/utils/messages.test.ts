import { describe, expect, it } from "vitest";
import { ValidationError } from "../../src/errors/index.js";
import {
  partitionSystemMessages,
  resolveMessages,
} from "../../src/utils/messages.js";

describe("partitionSystemMessages", () => {
  it("extracts system messages and merges with top-level system", () => {
    const result = partitionSystemMessages(
      [
        { role: "system", content: "Be helpful." },
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi!" },
      ],
      "Global prompt.",
    );

    expect(result.system).toBe("Global prompt.\nBe helpful.");
    expect(result.messages).toEqual([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi!" },
    ]);
  });

  it("returns undefined system when none is provided", () => {
    const result = partitionSystemMessages([
      { role: "user", content: "Hello" },
    ]);

    expect(result.system).toBeUndefined();
    expect(result.messages).toEqual([
      { role: "user", content: "Hello" },
    ]);
  });

  it("throws when only system messages are provided", () => {
    expect(() =>
      partitionSystemMessages([{ role: "system", content: "Be helpful." }]),
    ).toThrow(ValidationError);
  });
});

describe("resolveMessages", () => {
  it("wraps text as a user message", () => {
    expect(resolveMessages(undefined, "Hello")).toEqual([
      { role: "user", content: "Hello", parts: [{ type: "text", text: "Hello" }] },
    ]);
  });

  it("throws when a message has neither content nor parts", () => {
    expect(() =>
      resolveMessages([{ role: "user" } as never]),
    ).toThrow(ValidationError);
  });
});
