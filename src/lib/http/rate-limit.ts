import { ApiError } from "./api-error";

type Bucket = { count: number; resetAt: number };

const globalRateLimits = globalThis as typeof globalThis & {
  __okulYoklamaRateLimits?: Map<string, Bucket>;
};
const buckets = globalRateLimits.__okulYoklamaRateLimits ?? new Map<string, Bucket>();
globalRateLimits.__okulYoklamaRateLimits = buckets;

export function enforceRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  if (current.count >= options.limit) {
    throw new ApiError(429, "RATE_LIMITED", "Çok fazla istek gönderildi. Lütfen biraz bekleyin.");
  }
  current.count += 1;

  if (buckets.size > 10_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }
}
