import { describe, expect, it } from "vitest";
import { rankParticipants, successRate, type ScoreInput } from "./scoring";

function participant(overrides: Partial<ScoreInput> & { participantId: string }): ScoreInput {
  return {
    correctCount: 0,
    lastAnswerAt: null,
    registeredAt: new Date("2026-06-01T08:00:00Z"),
    ...overrides,
  };
}

describe("rankParticipants", () => {
  it("orders primarily by correctCount descending", () => {
    const ranked = rankParticipants([
      participant({ participantId: "low", correctCount: 5 }),
      participant({ participantId: "high", correctCount: 20 }),
      participant({ participantId: "mid", correctCount: 10 }),
    ]);
    expect(ranked.map((r) => r.participant.participantId)).toEqual(["high", "mid", "low"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("tie-break 1: same correctCount -> earlier lastAnswerAt wins", () => {
    const ranked = rankParticipants([
      participant({ participantId: "later", correctCount: 10, lastAnswerAt: new Date("2026-06-01T10:00:00Z") }),
      participant({ participantId: "earlier", correctCount: 10, lastAnswerAt: new Date("2026-06-01T09:00:00Z") }),
    ]);
    expect(ranked.map((r) => r.participant.participantId)).toEqual(["earlier", "later"]);
  });

  it("tie-break 2: same correctCount and lastAnswerAt -> earlier registeredAt wins", () => {
    const sameAnswerTime = new Date("2026-06-01T10:00:00Z");
    const ranked = rankParticipants([
      participant({
        participantId: "registeredLater",
        correctCount: 10,
        lastAnswerAt: sameAnswerTime,
        registeredAt: new Date("2026-06-01T08:30:00Z"),
      }),
      participant({
        participantId: "registeredEarlier",
        correctCount: 10,
        lastAnswerAt: sameAnswerTime,
        registeredAt: new Date("2026-06-01T08:00:00Z"),
      }),
    ]);
    expect(ranked.map((r) => r.participant.participantId)).toEqual(["registeredEarlier", "registeredLater"]);
  });

  it("participants with zero answers (lastAnswerAt = null) rank after those tied on correctCount who did answer", () => {
    const ranked = rankParticipants([
      participant({ participantId: "neverAnswered", correctCount: 0, lastAnswerAt: null }),
      participant({ participantId: "answeredOnce", correctCount: 0, lastAnswerAt: new Date("2026-06-01T09:00:00Z") }),
    ]);
    expect(ranked.map((r) => r.participant.participantId)).toEqual(["answeredOnce", "neverAnswered"]);
  });

  it("applies all three tie-break levels together in priority order", () => {
    const ranked = rankParticipants([
      participant({ participantId: "a", correctCount: 5, lastAnswerAt: new Date("2026-06-01T09:00:00Z") }),
      participant({ participantId: "b", correctCount: 8, lastAnswerAt: new Date("2026-06-01T11:00:00Z") }),
      participant({
        participantId: "c",
        correctCount: 8,
        lastAnswerAt: new Date("2026-06-01T10:00:00Z"),
        registeredAt: new Date("2026-06-01T07:00:00Z"),
      }),
      participant({
        participantId: "d",
        correctCount: 8,
        lastAnswerAt: new Date("2026-06-01T10:00:00Z"),
        registeredAt: new Date("2026-06-01T06:00:00Z"),
      }),
    ]);
    // d,c: shodné correctCount i lastAnswerAt -> rozhoduje dřívější registrace (d < c).
    // b: correctCount 8, ale pozdější lastAnswerAt -> za d,c.
    // a: nejnižší correctCount -> poslední.
    expect(ranked.map((r) => r.participant.participantId)).toEqual(["d", "c", "b", "a"]);
  });
});

describe("successRate", () => {
  it("returns 0 for zero total instead of NaN", () => {
    expect(successRate(0, 0)).toBe(0);
  });

  it("computes a percentage", () => {
    expect(successRate(3, 12)).toBe(25);
  });
});
