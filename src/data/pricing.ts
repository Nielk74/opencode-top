import Decimal from "decimal.js";
import type { ModelPricing } from "../core/types";

const DEFAULT_PRICING: ModelPricing = {
  input: new Decimal(0),
  output: new Decimal(0),
  cacheRead: new Decimal(0),
  cacheWrite: new Decimal(0),
  contextWindow: 128000,
};

const KNOWN_PRICING: Record<string, Partial<ModelPricing>> = {
  "claude-sonnet-4-20250514": {
    input: new Decimal(3),
    output: new Decimal(15),
    cacheRead: new Decimal(0.3),
    cacheWrite: new Decimal(3.75),
    contextWindow: 200000,
  },
  "claude-3-5-sonnet-20241022": {
    input: new Decimal(3),
    output: new Decimal(15),
    cacheRead: new Decimal(0.3),
    cacheWrite: new Decimal(3.75),
    contextWindow: 200000,
  },
  "claude-3-5-sonnet-20240620": {
    input: new Decimal(3),
    output: new Decimal(15),
    cacheRead: new Decimal(0.3),
    cacheWrite: new Decimal(3.75),
    contextWindow: 200000,
  },
  "claude-3-5-haiku-20241022": {
    input: new Decimal(1),
    output: new Decimal(5),
    cacheRead: new Decimal(0.1),
    cacheWrite: new Decimal(1.25),
    contextWindow: 200000,
  },
  "claude-3-haiku-20240307": {
    input: new Decimal(0.25),
    output: new Decimal(1.25),
    cacheRead: new Decimal(0.03),
    cacheWrite: new Decimal(0.3),
    contextWindow: 200000,
  },
  "claude-3-opus-20240229": {
    input: new Decimal(15),
    output: new Decimal(75),
    cacheRead: new Decimal(1.5),
    cacheWrite: new Decimal(18.75),
    contextWindow: 200000,
  },
  "claude-opus-4-20250514": {
    input: new Decimal(15),
    output: new Decimal(75),
    cacheRead: new Decimal(1.5),
    cacheWrite: new Decimal(18.75),
    contextWindow: 200000,
  },
};

export function getPricing(modelId: string): ModelPricing {
  const normalized = modelId.toLowerCase();
  
  for (const [key, pricing] of Object.entries(KNOWN_PRICING)) {
    if (normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) {
      return { ...DEFAULT_PRICING, ...pricing };
    }
  }
  
  return DEFAULT_PRICING;
}

export function getAllPricing(): Map<string, ModelPricing> {
  const result = new Map<string, ModelPricing>();
  for (const [key, pricing] of Object.entries(KNOWN_PRICING)) {
    result.set(key.toLowerCase(), { ...DEFAULT_PRICING, ...pricing });
  }
  return result;
}
