/**
 * Čistá funkce nad daty z DB — testovatelná bez databáze (§2.1, §13).
 * Vyhodnocení soutěže musí být jednoznačně ověřitelné.
 */

export interface ScoreInput {
  participantId: string;
  correctCount: number;
  /** Čas poslední odpovědi. `null`, pokud účastník ještě neodpověděl na nic. */
  lastAnswerAt: Date | null;
  registeredAt: Date;
}

export interface RankedParticipant<T extends ScoreInput = ScoreInput> {
  rank: number;
  participant: T;
}

/**
 * Pravidlo pořadí (§7.2), aplikováno přesně v tomto pořadí:
 *  1. více správných odpovědí
 *  2. při shodě: dřívější čas poslední odpovědi
 *  3. při shodě: dřívější registrace
 *
 * Účastníci bez jediné odpovědi (`lastAnswerAt === null`) se v rámci shody
 * v `correctCount` řadí až za ty, kteří už odpověděli.
 */
export function rankParticipants<T extends ScoreInput>(participants: T[]): RankedParticipant<T>[] {
  const sorted = [...participants].sort((a, b) => {
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;

    const aLast = a.lastAnswerAt ? a.lastAnswerAt.getTime() : Number.POSITIVE_INFINITY;
    const bLast = b.lastAnswerAt ? b.lastAnswerAt.getTime() : Number.POSITIVE_INFINITY;
    if (aLast !== bLast) return aLast - bLast;

    return a.registeredAt.getTime() - b.registeredAt.getTime();
  });

  return sorted.map((participant, index) => ({ rank: index + 1, participant }));
}

/** Bezpečné dělení pro procenta úspěšnosti — 0 jmenovatel vrací 0, ne NaN. */
export function successRate(correct: number, total: number): number {
  if (total <= 0) return 0;
  return (correct / total) * 100;
}
