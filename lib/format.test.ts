import { describe, expect, it } from "vitest";
import { formatDuration, formatDateTime } from "./format";

describe("formatDuration", () => {
  it("returns an em dash for null/negative/non-finite input", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(-5)).toBe("—");
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("—");
  });

  it("formats seconds only under a minute", () => {
    expect(formatDuration(45_000)).toBe("45 s");
    expect(formatDuration(0)).toBe("0 s");
  });

  it("formats minutes + seconds under an hour", () => {
    expect(formatDuration(3 * 60_000 + 12_000)).toBe("3 min 12 s");
  });

  it("formats hours + minutes over an hour (drops seconds)", () => {
    expect(formatDuration(60 * 60_000 + 24 * 60_000)).toBe("1 h 24 min");
  });
});

describe("formatDateTime", () => {
  it("returns an em dash for null", () => {
    expect(formatDateTime(null)).toBe("—");
  });

  it("renders in Europe/Prague, not the server's local time zone", () => {
    // 2026-06-01 noon UTC == 14:00 in Prague during CEST (UTC+2).
    const summer = new Date("2026-06-01T12:00:00.000Z");
    expect(formatDateTime(summer)).toContain("14:00");
  });
});
