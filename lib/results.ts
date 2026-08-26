import "server-only";
import { prisma } from "@/lib/prisma";
import type { ParticipantAgg, QuestionAgg } from "@/lib/stats";

/**
 * Datová vrstva pro výsledkový dashboard (§7). Agregace píšeme jako
 * `groupBy` dotazy, ne N+1 (§8) — pro ~200 účastníků × 30 otázek jde
 * o hrstku dotazů celkem, ne dotaz na účastníka.
 */
export async function getParticipantAggregates(): Promise<ParticipantAgg[]> {
  const [participants, answerStats] = await Promise.all([
    prisma.participant.findMany({
      include: { employee: { include: { company: true } } },
    }),
    prisma.answer.groupBy({
      by: ["participantId", "isCorrect"],
      _count: { _all: true },
      _max: { answeredAt: true },
    }),
  ]);

  const byParticipant = new Map<string, { answered: number; correct: number; lastAnswerAt: Date | null }>();
  for (const row of answerStats) {
    const entry = byParticipant.get(row.participantId) ?? { answered: 0, correct: 0, lastAnswerAt: null };
    entry.answered += row._count._all;
    if (row.isCorrect) entry.correct += row._count._all;
    if (row._max.answeredAt && (!entry.lastAnswerAt || row._max.answeredAt > entry.lastAnswerAt)) {
      entry.lastAnswerAt = row._max.answeredAt;
    }
    byParticipant.set(row.participantId, entry);
  }

  return participants.map((p) => {
    const agg = byParticipant.get(p.id) ?? { answered: 0, correct: 0, lastAnswerAt: null };
    return {
      participantId: p.id,
      fullName: p.employee.fullName,
      companyName: p.employee.company.name,
      language: p.language,
      answeredCount: agg.answered,
      correctCount: agg.correct,
      lastAnswerAt: agg.lastAnswerAt,
      registeredAt: p.registeredAt,
      reclaimCount: p.reclaimCount,
    };
  });
}

export async function getQuestionAggregates(): Promise<QuestionAgg[]> {
  const [questions, answerStats] = await Promise.all([
    prisma.question.findMany({
      include: { translations: { where: { language: "cs" } } },
      orderBy: { number: "asc" },
    }),
    prisma.answer.groupBy({
      by: ["questionId", "selectedOption", "isCorrect"],
      _count: { _all: true },
    }),
  ]);

  const byQuestion = new Map<
    string,
    { answered: number; correct: number; opt1: number; opt2: number; opt3: number }
  >();
  for (const row of answerStats) {
    const entry = byQuestion.get(row.questionId) ?? { answered: 0, correct: 0, opt1: 0, opt2: 0, opt3: 0 };
    entry.answered += row._count._all;
    if (row.isCorrect) entry.correct += row._count._all;
    if (row.selectedOption === 1) entry.opt1 += row._count._all;
    if (row.selectedOption === 2) entry.opt2 += row._count._all;
    if (row.selectedOption === 3) entry.opt3 += row._count._all;
    byQuestion.set(row.questionId, entry);
  }

  return questions.map((q) => {
    const agg = byQuestion.get(q.id) ?? { answered: 0, correct: 0, opt1: 0, opt2: 0, opt3: 0 };
    const csText = q.translations[0]?.text ?? "(chybí cs překlad)";
    return {
      number: q.number,
      textShort: csText.length > 70 ? `${csText.slice(0, 70)}…` : csText,
      answeredCount: agg.answered,
      correctCount: agg.correct,
      option1Count: agg.opt1,
      option2Count: agg.opt2,
      option3Count: agg.opt3,
    };
  });
}

export async function getAnswerTimestamps(): Promise<Date[]> {
  const rows = await prisma.answer.findMany({ select: { answeredAt: true } });
  return rows.map((r) => r.answeredAt);
}

export async function getTotalQuestions(): Promise<number> {
  return prisma.question.count({ where: { active: true } });
}
