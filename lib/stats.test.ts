import { describe, expect, it } from "vitest";
import { computeKPI, computeHistogram, computeCompanyStats, type ParticipantAgg } from "./stats";

function participant(overrides: Partial<ParticipantAgg> & { participantId: string }): ParticipantAgg {
  return {
    fullName: "Test User",
    companyName: "Test s.r.o.",
    language: "cs",
    answeredCount: 0,
    correctCount: 0,
    lastAnswerAt: null,
    registeredAt: new Date("2026-06-01T08:00:00Z"),
    reclaimCount: 0,
    ...overrides,
  };
}

describe("computeKPI", () => {
  it("aggregates totals and success rate", () => {
    const participants = [
      participant({ participantId: "a", answeredCount: 30, correctCount: 25 }),
      participant({ participantId: "b", answeredCount: 10, correctCount: 5 }),
      participant({ participantId: "c", answeredCount: 0, correctCount: 0 }),
    ];
    const kpi = computeKPI(participants, 30);
    expect(kpi.totalParticipants).toBe(3);
    expect(kpi.participantsWithAnswer).toBe(2);
    expect(kpi.participantsCompleted).toBe(1);
    expect(kpi.totalAnswers).toBe(40);
    expect(kpi.overallSuccessRate).toBe(75); // 30/40
  });

  it("handles zero participants without dividing by zero", () => {
    const kpi = computeKPI([], 30);
    expect(kpi.avgCorrectPerParticipant).toBe(0);
    expect(kpi.overallSuccessRate).toBe(0);
  });
});

describe("computeHistogram", () => {
  it("buckets participants by their correct-answer count", () => {
    const participants = [
      participant({ participantId: "a", correctCount: 30 }),
      participant({ participantId: "b", correctCount: 30 }),
      participant({ participantId: "c", correctCount: 0 }),
    ];
    const histogram = computeHistogram(participants, 30);
    expect(histogram).toHaveLength(31); // 0..30 inclusive
    expect(histogram[30].count).toBe(2);
    expect(histogram[0].count).toBe(1);
    expect(histogram[15].count).toBe(0);
  });
});

describe("computeCompanyStats", () => {
  it("groups by company and ranks by correctCount, but keeps successRate visible", () => {
    const participants = [
      participant({ participantId: "a", companyName: "Big Co", answeredCount: 30, correctCount: 15 }),
      participant({ participantId: "b", companyName: "Big Co", answeredCount: 30, correctCount: 15 }),
      participant({ participantId: "c", companyName: "Small Co", answeredCount: 30, correctCount: 28 }),
    ];
    const stats = computeCompanyStats(participants);
    // Big Co má víc správných odpovědí celkem (30 vs 28) -> je první, i když má nižší úspěšnost.
    expect(stats[0].companyName).toBe("Big Co");
    expect(stats[0].successRate).toBeCloseTo(50);
    expect(stats[1].companyName).toBe("Small Co");
    expect(stats[1].successRate).toBeCloseTo(93.33, 1);
  });
});
