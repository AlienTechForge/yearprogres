import type { NextApiRequest } from "next";

const CUSTOM_PROGRESS_ID_PATTERN = /^[A-Za-z0-9]{8,10}$/;
const MAX_RATE_LIMIT_BUCKETS = 5000;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function isValidCustomProgressId(value: unknown): value is string {
  return typeof value === "string" && CUSTOM_PROGRESS_ID_PATTERN.test(value);
}

export function getClientIp(req: NextApiRequest) {
  const cloudflareIp = sanitizeHeaderValue(firstHeaderValue(req.headers["cf-connecting-ip"]));
  if (cloudflareIp) {
    return cloudflareIp;
  }

  const realIp = sanitizeHeaderValue(firstHeaderValue(req.headers["x-real-ip"]));
  if (realIp) {
    return realIp;
  }

  const forwardedFor = sanitizeHeaderValue(firstHeaderValue(req.headers["x-forwarded-for"]));
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return sanitizeHeaderValue(req.socket.remoteAddress) || "unknown";
}

export function isJsonRequest(req: NextApiRequest) {
  const contentType = firstHeaderValue(req.headers["content-type"]);
  return Boolean(contentType?.toLowerCase().startsWith("application/json"));
}

export function isAllowedOrigin(req: NextApiRequest) {
  const origin = firstHeaderValue(req.headers.origin);
  const referer = firstHeaderValue(req.headers.referer);

  if (!origin && !referer) {
    return process.env.NODE_ENV !== "production";
  }

  const allowedHosts = new Set<string>();
  const publicUrl = process.env.NEXT_PUBLIC_URL;
  if (publicUrl) {
    try {
      allowedHosts.add(new URL(publicUrl).host.toLowerCase());
    } catch {
      // Ignore invalid env; dev can still fall back to requestHost below.
    }
  }

  const requestHost = firstHeaderValue(req.headers.host);
  if (process.env.NODE_ENV !== "production" && requestHost) {
    allowedHosts.add(requestHost.toLowerCase());
  }

  if (origin) {
    return isAllowedUrl(origin, allowedHosts);
  }

  return referer ? isAllowedUrl(referer, allowedHosts) : false;
}

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    pruneRateLimitBuckets(now);
    evictOldestRateLimitBuckets();
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export function hasControlCharacters(value: string) {
  return /[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/u.test(value);
}

function firstHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isAllowedUrl(value: string, allowedHosts: Set<string>) {
  try {
    return allowedHosts.has(new URL(value).host.toLowerCase());
  } catch {
    return false;
  }
}

function pruneRateLimitBuckets(now: number) {
  if (rateLimitBuckets.size < MAX_RATE_LIMIT_BUCKETS) {
    return;
  }

  for (const [key, bucket] of Array.from(rateLimitBuckets.entries())) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

function evictOldestRateLimitBuckets() {
  while (rateLimitBuckets.size >= MAX_RATE_LIMIT_BUCKETS) {
    const oldestKey = rateLimitBuckets.keys().next().value;
    if (!oldestKey) {
      return;
    }

    rateLimitBuckets.delete(oldestKey);
  }
}

function sanitizeHeaderValue(value: string | undefined) {
  return value?.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
}
