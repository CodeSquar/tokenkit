# TokenKit

Count prompt tokens (and a rough USD cost) for OpenAI, Anthropic, and Gemini before you call the API.

With an API key it uses each provider's official count endpoint. Without one, or if the call fails, it falls back to local tokenizers or a simple chars/4 heuristic.

## Install

```bash
npm install tokenkit
```

## Usage

```ts
import { countTokens, estimateTokens } from "tokenkit";

const result = await countTokens({
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  messages: [{ role: "user", content: "Hello world" }],
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log(result.tokens);    // e.g. 14
console.log(result.estimated); // false when the provider API answered
console.log(result.price);     // { usd: 0.000042 } or null if the model is not in the pricing table
```

Local only (no network):

```ts
const estimate = await estimateTokens({
  provider: "google",
  model: "gemini-2.0-flash",
  text: "Hello world",
});
// same as countTokens({ ..., mode: "local" })
```

## Modes

- `auto` (default): provider endpoint when a key is available, local fallback on failure
- `endpoint`: provider count API only (requires a key)
- `local`: no network

## API keys

From env vars or pass `apiKey` in the options object.

| Provider | Env var |
|----------|---------|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Google | `GEMINI_API_KEY` or `GOOGLE_API_KEY` |

## Response

```ts
{
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  tokens: 14,
  estimated: false,
  method: "provider_endpoint", // or "tiktoken", "anthropic_tokenizer", "heuristic"
  price: { usd: 0.000042 }     // null when the model is missing from pricing data
}
```

## Local fallbacks

| Provider | Strategy |
|----------|----------|
| OpenAI | `tiktoken` |
| Anthropic | `@anthropic-ai/tokenizer` (approximate for Claude 3+) |
| Google | chars/4 heuristic |

`countHeuristic()` is exported if you want the heuristic without the provider plumbing.

## API

- `countTokens(options)` - count + optional price
- `estimateTokens(options)` - shorthand for `mode: "local"`
- `calculatePrice({ provider, model, tokens })` - prompt cost only
- `countHeuristic({ messages?, text?, system? })`

## Tests

Integration tests hit real count endpoints (frontier models). They skip when a provider key is missing.

```bash
cp .env.example .env
npm run test:integration
```

Unit tests stay mocked: `npm test`

## Limits (MVP)

- Input/prompt tokens only, no output counting
- Text messages only (no multimodal)
- Gemini via AI Studio, not Vertex AI
- Heuristic counts are approximate (~25% off on typical prose)

See [count-endpoint.md](./count-endpoint.md) for the provider count endpoints this wraps.
