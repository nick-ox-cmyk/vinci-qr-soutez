import { describe, expect, it, afterEach } from "vitest";
import { isValidAdminUrlToken, isValidAdminPassword, isValidBypassToken } from "./session";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("timing-safe token checks (§7.1, §9 bypass)", () => {
  it("isValidAdminUrlToken matches only the exact configured token", () => {
    process.env.ADMIN_URL_TOKEN = "correct-token-value";
    expect(isValidAdminUrlToken("correct-token-value")).toBe(true);
    expect(isValidAdminUrlToken("wrong-token-value")).toBe(false);
    expect(isValidAdminUrlToken("short")).toBe(false);
  });

  it("isValidAdminUrlToken is always false when ADMIN_URL_TOKEN is unset", () => {
    delete process.env.ADMIN_URL_TOKEN;
    expect(isValidAdminUrlToken("anything")).toBe(false);
    expect(isValidAdminUrlToken("")).toBe(false);
  });

  it("isValidAdminPassword matches only the exact configured password", () => {
    process.env.ADMIN_PASSWORD = "alfaromeo";
    expect(isValidAdminPassword("alfaromeo")).toBe(true);
    expect(isValidAdminPassword("wrong")).toBe(false);
  });

  it("isValidBypassToken matches only the exact configured bypass token", () => {
    process.env.COMPETITION_BYPASS_TOKEN = "let-us-test-early";
    expect(isValidBypassToken("let-us-test-early")).toBe(true);
    expect(isValidBypassToken("guessed-value")).toBe(false);
  });

  it("isValidBypassToken is always false once COMPETITION_BYPASS_TOKEN is unset — this is how the bypass gets 'hidden' on the real domain", () => {
    delete process.env.COMPETITION_BYPASS_TOKEN;
    // Ani starý, dřív platný token nesmí projít, jakmile proměnná zmizí.
    expect(isValidBypassToken("let-us-test-early")).toBe(false);
    expect(isValidBypassToken("")).toBe(false);
  });
});
