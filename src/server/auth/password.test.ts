import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("passwords", () => {
  it("stores neither the password nor the same hash twice", async () => {
    const [first, second] = await Promise.all([hashPassword("secret"), hashPassword("secret")]);
    expect(first).not.toContain("secret");
    expect(first).not.toBe(second);
  });

  it("accepts only the right password", async () => {
    const stored = await hashPassword("secret");
    expect(await verifyPassword("secret", stored)).toBe(true);
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });

  it("refuses an account without a usable hash", async () => {
    expect(await verifyPassword("secret", undefined)).toBe(false);
    expect(await verifyPassword("secret", "secret")).toBe(false);
  });
});
