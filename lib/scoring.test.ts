import { describe, expect, it } from "vitest";
import {
  rankParticipants,
  successRate,
  netCompetingTimeMs,
  totalTimeMs,
  avgTimeBetweenAnswersMs,
  type ScoreInput,
} from "./scoring";

function participant(overrides: Partial<ScoreInput> & { participantId: string }): ScoreInput {
  return {
    correctCount: 0,
    answeredCount: 0,
    firstAnswerAt: null,
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

describe("rankParticipants with considerSpeed", () => {
  it("does not change anything when correctCount is not tied", () => {
    const ranked = rankParticipants(
      [
        participant({ participantId: "slow-but-more-correct", correctCount: 10, firstAnswerAt: new Date("2026-06-01T09:00:00Z"), lastAnswerAt: new Date("2026-06-01T12:00:00Z") }),
        participant({ participantId: "fast-but-fewer-correct", correctCount: 8, firstAnswerAt: new Date("2026-06-01T09:00:00Z"), lastAnswerAt: new Date("2026-06-01T09:05:00Z") }),
      ],
      { considerSpeed: true }
    );
    expect(ranked.map((r) => r.participant.participantId)).toEqual(["slow-but-more-correct", "fast-but-fewer-correct"]);
  });

  it("on a tie, orders by net competing time (lastAnswerAt - firstAnswerAt) instead of lastAnswerAt", () => {
    const withoutSpeed = rankParticipants([
      // "b" finished later overall but raced through faster once it started.
      participant({ participantId: "a", correctCount: 10, firstAnswerAt: new Date("2026-06-01T08:00:00Z"), lastAnswerAt: new Date("2026-06-01T09:00:00Z") }), // net 1h
      participant({ participantId: "b", correctCount: 10, firstAnswerAt: new Date("2026-06-01T10:00:00Z"), lastAnswerAt: new Date("2026-06-01T10:10:00Z") }), // net 10min, but later lastAnswerAt
    ]);
    expect(withoutSpeed.map((r) => r.participant.participantId)).toEqual(["a", "b"]); // default: earlier lastAnswerAt wins

    const withSpeed = rankParticipants(
      [
        participant({ participantId: "a", correctCount: 10, firstAnswerAt: new Date("2026-06-01T08:00:00Z"), lastAnswerAt: new Date("2026-06-01T09:00:00Z") }),
        participant({ participantId: "b", correctCount: 10, firstAnswerAt: new Date("2026-06-01T10:00:00Z"), lastAnswerAt: new Date("2026-06-01T10:10:00Z") }),
      ],
      { considerSpeed: true }
    );
    expect(withSpeed.map((r) => r.participant.participantId)).toEqual(["b", "a"]); // speed: shorter net time wins
  });

  it("participants with no net time (missing first/lastAnswerAt) rank after those with one, even with considerSpeed", () => {
    const ranked = rankParticipants(
      [
        participant({ participantId: "neverAnswered", correctCount: 0 }),
        participant({ participantId: "answered", correctCount: 0, firstAnswerAt: new Date("2026-06-01T09:00:00Z"), lastAnswerAt: new Date("2026-06-01T09:05:00Z") }),
      ],
      { considerSpeed: true }
    );
    expect(ranked.map((r) => r.participant.participantId)).toEqual(["answered", "neverAnswered"]);
  });

  it("falls back to registeredAt when net time also ties", () => {
    const sameFirst = new Date("2026-06-01T09:00:00Z");
    const sameLast = new Date("2026-06-01T09:10:00Z");
    const ranked = rankParticipants(
      [
        participant({ participantId: "later", correctCount: 5, firstAnswerAt: sameFirst, lastAnswerAt: sameLast, registeredAt: new Date("2026-06-01T08:30:00Z") }),
        participant({ participantId: "earlier", correctCount: 5, firstAnswerAt: sameFirst, lastAnswerAt: sameLast, registeredAt: new Date("2026-06-01T08:00:00Z") }),
      ],
      { considerSpeed: true }
    );
    expect(ranked.map((r) => r.participant.participantId)).toEqual(["earlier", "later"]);
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

describe("timing metrics (B.2)", () => {
  const firstAnswerAt = new Date("2026-06-01T09:00:00.000Z");
  const lastAnswerAt = new Date("2026-06-01T09:10:00.500Z"); // +10min 500ms
  const registeredAt = new Date("2026-06-01T08:00:00.000Z");

  it("netCompetingTimeMs is lastAnswerAt - firstAnswerAt", () => {
    expect(netCompetingTimeMs({ firstAnswerAt, lastAnswerAt })).toBe(600_500);
  });

  it("netCompetingTimeMs is null without both timestamps", () => {
    expect(netCompetingTimeMs({ firstAnswerAt: null, lastAnswerAt })).toBeNull();
    expect(netCompetingTimeMs({ firstAnswerAt, lastAnswerAt: null })).toBeNull();
  });

  it("totalTimeMs is lastAnswerAt - registeredAt, null without an answer", () => {
    expect(totalTimeMs({ registeredAt, lastAnswerAt })).toBe(4_200_500);
    expect(totalTimeMs({ registeredAt, lastAnswerAt: null })).toBeNull();
  });

  it("avgTimeBetweenAnswersMs divides net time by (answeredCount - 1)", () => {
    expect(avgTimeBetweenAnswersMs({ firstAnswerAt, lastAnswerAt, answeredCount: 6 })).toBe(600_500 / 5);
  });

  it("avgTimeBetweenAnswersMs is null with 0 or 1 answers (would divide by zero)", () => {
    expect(avgTimeBetweenAnswersMs({ firstAnswerAt, lastAnswerAt, answeredCount: 1 })).toBeNull();
    expect(avgTimeBetweenAnswersMs({ firstAnswerAt: null, lastAnswerAt: null, answeredCount: 0 })).toBeNull();
  });
});
