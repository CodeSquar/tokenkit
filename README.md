<p align="center">
  <img src="./docs/image.png" alt="TokenKit" width="100%" />
</p>

Count tokens **before sending a request** or **before persisting a provider response** to your database. TokenKit supports OpenAI, Anthropic, and Google so you can track context window usage with accurate counts, plan what fits in the next turn, and avoid unexpected API costs.

Uses the provider's official endpoint when available (`mode: "endpoint"` or `"auto"` with an API key). Otherwise, it uses local strategies (`mode: "local"`).

## Install

```bash
npm install tokenkit
```

## Usage

```ts
import { countTokens, estimateTokens } from "tokenkit";

const result = await countTokens({
  provider: "openai",
  model: "gpt-5.5",
  inputMode: "provider",
  input: [
    { role: "user", content: "Hello" },
    {
      type: "function_call",
      call_id: "call_1",
      name: "get_weather",
      arguments: "{\"city\":\"Paris\"}",
    },
  ],
  apiKey: process.env.OPENAI_API_KEY,
  countAssistantTools: true,
});

console.log(result.tokens);
console.log(result.estimated);
console.log(result.method);
console.log(result.price);
```

### AI SDK (`ModelMessage` / `UIMessage`)

```ts
import type { ModelMessage, UIMessage } from "ai";
import { countTokens } from "tokenkit";

const modelMessages: ModelMessage[] = [
  { role: "system", content: "Be concise." },
  { role: "user", content: [{ type: "text", text: "Hello" }] },
];

await countTokens({
  provider: "openai",
  model: "gpt-4o",
  inputMode: "ai_sdk",
  aiSdkMessages: modelMessages,
});

const uiMessages: UIMessage[] = [
  {
    id: "1",
    role: "user",
    parts: [{ type: "text", text: "Hi from UIMessage" }],
  },
];

await countTokens({
  provider: "google",
  model: "gemini-2.0-flash",
  inputMode: "ai_sdk",
  uiMessages,
});
```

## Provider Inputs

### OpenAI

```ts
await countTokens({
  provider: "openai",
  model: "gpt-5.5",
  inputMode: "text",
  input: "Hello world",
});

await countTokens({
  provider: "openai",
  model: "gpt-5.5",
  inputMode: "provider",
  input: [{ role: "user", content: "Hello world" }], // ResponseInput
});
```

### Anthropic

```ts
await countTokens({
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  inputMode: "text",
  input: "Hello",
  system: "Be concise",
});

await countTokens({
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  inputMode: "provider",
  messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
  system: "Be concise",
});
```

### Google (Gemini)

```ts
await countTokens({
  provider: "google",
  model: "gemini-3.5-flash",
  inputMode: "text",
  input: "Hello",
});

await countTokens({
  provider: "google",
  model: "gemini-3.5-flash",
  inputMode: "provider",
  contents: [{ role: "user", parts: [{ text: "Hello" }] }],
});
```

## `inputMode`

Default: `provider`.

- `provider`: expects native provider payload:
  - OpenAI: `input` (`string | ResponseInput`)
  - Anthropic: `messages`
  - Google: `contents`
- `text`: expects `input: string` and TokenKit converts it internally to native provider payload.
- `ai_sdk`: expects `aiSdkMessages: ModelMessage[]` or `uiMessages: UIMessage[]` and TokenKit converts them to native provider payload.

Validation is fail-fast:
- In `text` mode, `input` is required and must be non-empty.
- In `provider` mode, `input` is rejected for Anthropic and Google.
- In `ai_sdk` mode, model support is strict: the model must exist in TokenKit catalog and be supported by AI SDK for that provider.
- In `ai_sdk` mode (v1), non-text media parts are ignored for counting; text and tool parts are counted.

## `countAssistantTools`

Default: `true`.

When set to `false`, tool blocks are excluded from the count:
- OpenAI: `function_call`, `function_call_output`
- Anthropic: `tool_use`, `tool_result`
- Google: `functionCall`, `functionResponse`

## Modes

- `auto` (default): tries the endpoint and falls back to local if a recoverable error occurs
- `endpoint`: uses only the provider endpoint
- `local`: no network

`estimateTokens(options)` is equivalent to `countTokens({ ...options, mode: "local" })`.

## API Keys

Can be passed via `apiKey` or environment variables:

| Provider | Env var |
|----------|---------|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Google | `GEMINI_API_KEY` or `GOOGLE_API_KEY` |

## Response Shape

```ts
{
  provider: "openai" | "anthropic" | "google",
  model: string,
  tokens: number,
  estimated: boolean,
  method: "provider_endpoint" | "local_tiktoken" | "local_anthropic" | "local_heuristic",
  price: { usd: number } | null
}
```

## Local Strategies

- OpenAI: `tiktoken`
- Anthropic: `@anthropic-ai/tokenizer`
- Google: chars/4 heuristic

Also exports `countHeuristic({ text })`.

## Scripts

```bash
npm test
npm run test:integration
npm run try:all
npm run try:openai
```

## Notes

- Counts input tokens (prompt/input), not output tokens.
- `price` is `null` if the model is not in the pricing table.

For more endpoint details: [count-endpoint.md](./count-endpoint.md)
