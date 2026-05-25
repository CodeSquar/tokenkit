import { describe, expect, it } from "vitest";
import { inferContentKind } from "../../src/content/infer.js";

describe("inferContentKind", () => {
  it("detects plain text", () => {
    expect(inferContentKind("hello", "openai")).toBe("text");
  });

  it("detects OpenAI native function items", () => {
    expect(
      inferContentKind(
        [{ type: "function_call", call_id: "1", name: "x", arguments: "{}" }],
        "openai",
      ),
    ).toBe("openai-native");
  });

  it("detects OpenAI native role messages", () => {
    expect(
      inferContentKind([{ role: "user", content: "hello" }], "openai"),
    ).toBe("openai-native");
  });

  it("detects AI SDK messages with system role", () => {
    expect(
      inferContentKind(
        [
          { role: "system", content: "Be concise" },
          { role: "user", content: "hello" },
        ],
        "openai",
      ),
    ).toBe("messages");
  });

  it("detects AI SDK tool messages", () => {
    expect(
      inferContentKind(
        [
          {
            role: "assistant",
            content: [{ type: "tool-call", toolCallId: "1", toolName: "x", input: {} }],
          },
        ],
        "anthropic",
      ),
    ).toBe("messages");
  });

  it("detects Anthropic native messages", () => {
    expect(
      inferContentKind(
        [{ role: "user", content: [{ type: "text", text: "hello" }] }],
        "anthropic",
      ),
    ).toBe("anthropic-native");
  });

  it("detects Google native contents", () => {
    expect(
      inferContentKind(
        [{ role: "user", parts: [{ text: "hello" }] }],
        "google",
      ),
    ).toBe("google-native");
  });

  it("detects Google AI SDK messages by content shape", () => {
    expect(
      inferContentKind([{ role: "user", content: "hello" }], "google"),
    ).toBe("messages");
  });

  it("detects UIMessage arrays", () => {
    expect(
      inferContentKind(
        [{ id: "1", role: "user", parts: [{ type: "text", text: "hello" }] }],
        "openai",
      ),
    ).toBe("ui");
  });
});
