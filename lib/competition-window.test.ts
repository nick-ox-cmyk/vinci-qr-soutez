import { describe, expect, it } from "vitest";
import { resolveCompetitionPhase, formatCompetitionDateTime } from "./competition-window";

describe("resolveCompetitionPhase", () => {
  const start = new Date("2026-09-14T06:00:00.000Z");
  const end = new Date("2026-09-18T14:00:00.000Z");

  it("is 'before' strictly before start", () => {
    expect(resolveCompetitionPhase(new Date("2026-09-14T05:59:59.999Z"), start, end)).toBe("before");
  });

  it("is 'open' at the exact start and exact end instant, and in between", () => {
    expect(resolveCompetitionPhase(start, start, end)).toBe("open");
    expect(resolveCompetitionPhase(end, start, end)).toBe("open");
    expect(resolveCompetitionPhase(new Date("2026-09-16T12:00:00.000Z"), start, end)).toBe("open");
  });

  it("is 'after' strictly after end", () => {
    expect(resolveCompetitionPhase(new Date("2026-09-18T14:00:00.001Z"), start, end)).toBe("after");
  });
});

describe("formatCompetitionDateTime", () => {
  const start = new Date("2026-09-14T06:00:00.000Z");

  it("shows 8:00 in CEST-zone languages (cs/sk/pl/hu/en)", () => {
    for (const lang of ["cs", "sk", "pl", "hu", "en"] as const) {
      expect(formatCompetitionDateTime(start, lang)).toContain("8:00");
    }
  });

  it("shows 9:00 in EEST-zone languages (ro/bg) — same UTC instant, one hour ahead locally", () => {
    for (const lang of ["ro", "bg"] as const) {
      expect(formatCompetitionDateTime(start, lang)).toContain("9:00");
    }
  });
});
