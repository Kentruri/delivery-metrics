import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";
import {
  createRateLimiter,
  createSessionToken,
  isValidSession,
  readCookie,
  sessionCookie,
} from "./session.js";

const SECRET = "a-secret-that-is-at-least-thirty-two-chars";

describe("passwords", () => {
  it("verifies the password it hashed and nothing else", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("wrong", stored)).toBe(false);
    expect(await verifyPassword("anything", "bcrypt$x")).toBe(false);
  });
});

describe("sessions", () => {
  it("accepts its own token until it expires, and nothing tampered", () => {
    const now = Date.UTC(2026, 10, 9);
    const token = createSessionToken(SECRET, now);
    expect(isValidSession(SECRET, token, now + 1000)).toBe(true);
    expect(isValidSession(SECRET, token, now + 31 * 24 * 3_600_000)).toBe(false);
    expect(isValidSession("another-secret-that-is-long-enough!!", token, now)).toBe(false);
    expect(
      isValidSession(SECRET, `${Number(token.split(".")[0]) + 1}.${token.split(".")[1]}`, now),
    ).toBe(false);
    expect(isValidSession(SECRET, undefined, now)).toBe(false);
    expect(isValidSession(SECRET, "nodot", now)).toBe(false);
  });

  it("reads and writes the cookie", () => {
    expect(readCookie("a=1; dm_session=abc.def; b=2", "dm_session")).toBe("abc.def");
    expect(readCookie(undefined, "dm_session")).toBeUndefined();
    expect(sessionCookie("abc", true)).toBe(
      "dm_session=abc; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure",
    );
    expect(sessionCookie(null, false)).toBe(
      "dm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    );
  });

  it("limits attempts per key and window, and forgets old keys", () => {
    const allow = createRateLimiter(2, 1000);
    expect([allow("ip", 0), allow("ip", 1), allow("ip", 2)]).toEqual([true, true, false]);
    expect(allow("ip", 1001)).toBe(true);
    for (let index = 0; index <= 10_000; index += 1) {
      allow(`k${index}`, 0);
    }
    expect(allow("fresh", 5000)).toBe(true);
  });
});
