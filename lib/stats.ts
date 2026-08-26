/**
 * Čisté agregační funkce pro výsledkový dashboard (§7.2, §7.3). Vstupem jsou
 * už z DB vytažená (a případně `groupBy`-agregovaná) data — funkce samy
 * databázi nevolají, takže jdou testovat bez ní.
 */
import { successRate } from "./scoring";
import type { Language } from "@prisma/client";

export interface ParticipantAgg {
  participantId: string;
  fullName: string;
  companyName: string;
  language: Language;
  answeredCount: number;
  correctCount: number;
  lastAnswerAt: Date | null;
  registeredAt: Date;
  reclaimCount: number;
}

// ---------- KPI dlaždice ----------

export interface DashboardKPI {
  totalParticipants: number;
  participantsWithAnswer: number;
  participantsCompleted: number;
  totalAnswers: number;
  avgCorrectPerParticipant: number;
  overallSuccessRate: number;
}

export function computeKPI(participants: ParticipantAgg[], totalQuestions: number): DashboardKPI {
  const totalParticipants = participants.length;
  const participantsWithAnswer = participants.filter((p) => p.answeredCount > 0).length;
  const participantsCompleted = participants.filter((p) => p.answeredCount >= totalQuestions).length;
  const totalAnswers = participants.reduce((sum, p) => sum + p.answeredCount, 0);
  const totalCorrect = participants.reduce((sum, p) => sum + p.correctCount, 0);

  return {
    totalParticipants,
    participantsWithAnswer,
    participantsCompleted,
    totalAnswers,
    avgCorrectPerParticipant: totalParticipants > 0 ? totalCorrect / totalParticipants : 0,
    overallSuccessRate: successRate(totalCorrect, totalAnswers),
  };
}

// ---------- Karta vítěze ----------

export interface WinnerCard {
  fullName: string;
  companyName: string;
  correctCount: number;
  lastAnswerAt: Date | null;
}

export function computeWinner(
  rankedFirst: ParticipantAgg | undefined
): WinnerCard | null {
  if (!rankedFirst) return null;
  return {
    fullName: rankedFirst.fullName,
    companyName: rankedFirst.companyName,
    correctCount: rankedFirst.correctCount,
    lastAnswerAt: rankedFirst.lastAnswerAt,
  };
}

// ---------- Pořadí firem ----------

export interface CompanyStat {
  companyName: string;
  participantCount: number;
  answeredCount: number;
  correctCount: number;
  successRate: number;
}

export function computeCompanyStats(participants: ParticipantAgg[]): CompanyStat[] {
  const byCompany = new Map<string, CompanyStat>();

  for (const p of participants) {
    const existing = byCompany.get(p.companyName) ?? {
      companyName: p.companyName,
      participantCount: 0,
      answeredCount: 0,
      correctCount: 0,
      successRate: 0,
    };
    existing.participantCount += 1;
    existing.answeredCount += p.answeredCount;
    existing.correctCount += p.correctCount;
    byCompany.set(p.companyName, existing);
  }

  const stats = [...byCompany.values()].map((c) => ({
    ...c,
    successRate: successRate(c.correctCount, c.answeredCount),
  }));

  // Primárně dle zadání podle počtu správných odpovědí (viz poznámka v §7.2 o tom,
  // že se navíc zobrazují i procenta, aby to nezvýhodňovalo jen velké firmy).
  return stats.sort((a, b) => b.correctCount - a.correctCount);
}

// ---------- Statistika otázek ----------

export interface QuestionAgg {
  number: number;
  textShort: string;
  answeredCount: number;
  correctCount: number;
  option1Count: number;
  option2Count: number;
  option3Count: number;
}

export interface QuestionStat extends QuestionAgg {
  successRate: number;
}

export function computeQuestionStats(questions: QuestionAgg[]): QuestionStat[] {
  return questions
    .map((q) => ({ ...q, successRate: successRate(q.correctCount, q.answeredCount) }))
    .sort((a, b) => a.number - b.number);
}

// ---------- Histogram výsledků ----------

export interface HistogramBucket {
  score: number;
  count: number;
}

export function computeHistogram(participants: ParticipantAgg[], totalQuestions: number): HistogramBucket[] {
  const buckets: HistogramBucket[] = Array.from({ length: totalQuestions + 1 }, (_, score) => ({
    score,
    count: 0,
  }));
  for (const p of participants) {
    const score = Math.min(p.correctCount, totalQuestions);
    if (buckets[score]) buckets[score].count += 1;
  }
  return buckets;
}

// ---------- Výsledky podle jazyka ----------

export interface LanguageStat {
  language: Language;
  participantCount: number;
  avgSuccessRate: number;
}

export function computeLanguageStats(participants: ParticipantAgg[]): LanguageStat[] {
  const languages: Language[] = ["cs", "hu", "pl"];
  return languages.map((language) => {
    const group = participants.filter((p) => p.language === language);
    const totalAnswered = group.reduce((sum, p) => sum + p.answeredCount, 0);
    const totalCorrect = group.reduce((sum, p) => sum + p.correctCount, 0);
    return {
      language,
      participantCount: group.length,
      avgSuccessRate: successRate(totalCorrect, totalAnswered),
    };
  });
}

// ---------- Odpovědi v čase ----------

export interface TimeBucket {
  bucketStart: Date;
  count: number;
}

/** Rozdělí odpovědi do intervalů po `bucketMinutes` minutách od první odpovědi. */
export function computeTimeSeries(
  answeredAtTimes: Date[],
  bucketMinutes: number = 15
): TimeBucket[] {
  if (answeredAtTimes.length === 0) return [];

  const sorted = [...answeredAtTimes].sort((a, b) => a.getTime() - b.getTime());
  const bucketMs = bucketMinutes * 60 * 1000;
  const start = Math.floor(sorted[0].getTime() / bucketMs) * bucketMs;
  const end = sorted[sorted.length - 1].getTime();

  const bucketCount = Math.floor((end - start) / bucketMs) + 1;
  const buckets: TimeBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
    bucketStart: new Date(start + i * bucketMs),
    count: 0,
  }));

  for (const t of sorted) {
    const index = Math.floor((t.getTime() - start) / bucketMs);
    buckets[index].count += 1;
  }

  return buckets;
}
