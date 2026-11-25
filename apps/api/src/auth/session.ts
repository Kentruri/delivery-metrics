import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "dm_session";
const MAX_AGE_SECONDS = 30 * 24 * 3600;

const sign = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");

const equal = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

// The token is its own expiry, signed: no session table to keep.
export const createSessionToken = (secret: string, now: number) => {
  const expires = String(now + MAX_AGE_SECONDS * 1000);
  return `${expires}.${sign(secret, expires)}`;
};

export const isValidSession = (secret: string, token: string | undefined, now: number) => {
  const [expires, signature] = (token ?? "").split(".");
  return Boolean(
    expires && signature && equal(signature, sign(secret, expires)) && Number(expires) > now,
  );
};

export const readCookie = (header: string | undefined, name: string) =>
  header
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

export const sessionCookie = (token: string | null, secure: boolean) =>
  [
    `${SESSION_COOKIE}=${token ?? ""}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${token ? MAX_AGE_SECONDS : 0}`,
    ...(secure ? ["Secure"] : []),
  ].join("; ");

export const createRateLimiter = (limit: number, windowMs: number) => {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (key: string, now: number) => {
    if (hits.size > 10_000) {
      for (const [entryKey, entry] of hits) {
        if (entry.resetAt <= now) {
          hits.delete(entryKey);
        }
      }
    }
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
};
