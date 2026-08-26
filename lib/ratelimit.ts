import "server-only";

/**
 * Vyměnitelná abstrakce nad rate limitem (§8). Pro ~200 účastníků stačí
 * jednoduché in-memory sliding window; rozhraní je ale navržené tak, aby šlo
 * bez dopadu na volající kód nahradit implementací nad Upstash Redis (sdílený
 * stav mezi serverless instancemi) — stačí dodat objekt se stejnou metodou
 * `check()`.
 */
export interface RateLimiter {
  check(key: string): { success: boolean; remaining: number };
}

interface Window {
  count: number;
  windowStart: number;
}

export function createInMemoryRateLimiter(opts: { limit: number; windowMs: number }): RateLimiter {
  const store = new Map<string, Window>();

  return {
    check(key: string) {
      const now = Date.now();
      const entry = store.get(key);

      // Občasný úklid, ať mapa neroste bez omezení po celou dobu běhu akce.
      if (store.size > 5000) {
        for (const [k, w] of store) {
          if (now - w.windowStart >= opts.windowMs) store.delete(k);
        }
      }

      if (!entry || now - entry.windowStart >= opts.windowMs) {
        store.set(key, { count: 1, windowStart: now });
        return { success: true, remaining: opts.limit - 1 };
      }

      if (entry.count >= opts.limit) {
        return { success: false, remaining: 0 };
      }

      entry.count += 1;
      return { success: true, remaining: opts.limit - entry.count };
    },
  };
}

// Konkrétní limity dle §8.
export const searchRateLimiter = createInMemoryRateLimiter({ limit: 30, windowMs: 60_000 });
export const questionPageRateLimiter = createInMemoryRateLimiter({ limit: 60, windowMs: 60_000 });
export const submitAnswerRateLimiter = createInMemoryRateLimiter({ limit: 20, windowMs: 60_000 });
export const adminLoginRateLimiter = createInMemoryRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

/** Nejlepší dostupný odhad IP adresy klienta z hlaviček za Vercel proxy. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
