import type {
  AnyNormalizedInput,
  LocalStrategy,
  Method,
  Provider,
} from "../types/index.js";

export interface ProviderAdapter {
  readonly id: Provider;
  readonly localStrategy: LocalStrategy;
  supportsEndpoint(): boolean;
  countViaEndpoint(input: AnyNormalizedInput): Promise<number>;
  countViaLocal(input: AnyNormalizedInput): number;
  getLocalMethod(): Method;
}
