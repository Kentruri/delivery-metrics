import { describe, expect, it } from "vitest";
import { healthEndpoint } from "./health.js";

describe("healthEndpoint", () => {
  it("accepts an ok status", () => {
    expect(healthEndpoint.response.parse({ status: "ok" })).toEqual({ status: "ok" });
  });

  it("rejects any other status", () => {
    expect(healthEndpoint.response.safeParse({ status: "down" }).success).toBe(false);
  });
});
