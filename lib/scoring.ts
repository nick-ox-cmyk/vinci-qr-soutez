/**
 * Čisté funkce nad daty z DB — testovatelné bez databáze (§2.1, §13).
 * Vyhodnocení soutěže musí být jednoznačně ověřitelné.
 */

export interface ScoreInput {
  participantId: string;
  correctCount: number;
  answeredCount: number;
  /** Čas první odpovědi. `null`, pokud účastník ještě neodpověděl na nic. */
  firstAnswerAt: Date | null;
  /** Čas poslední odpovědi. `null`, pokud účastník ještě neodpověděl na nic. */
  lastAnswerAt: Date | null;
  registeredAt: Date;
}

export interface RankedParticipant<T extends ScoreInput = ScoreInput> {
  rank: number;
  participant: T;
}

export interface RankOptions {
  /**
   * Při shodě v `correctCount` řadí podle čistého času soutěžení
   * (lastAnswerAt − firstAnswerAt) místo podle času poslední odpovědi.
   * Výchozí pravidlo (§7.2) se nemění — tohle je jen volitelný přepínač
   * „Zohlednit rychlost" nad tabulkou pořadí, ne druhá kopie logiky.
   */
  considerSpeed?: boolean;
}

/**
 * Pravidlo pořadí (§7.2), aplikováno přesně v tomto pořadí:
 *  1. více správných odpovědí
 *  2. při shodě: dřívější čas poslední odpovědi
 *     (s `considerSpeed: true` místo toho kratší čistý čas soutěžení)
 *  3. při shodě: dřívější registrace
 *
 * Účastníci bez jediné odpovědi (`lastAnswerAt === null`) se v rámci shody
 * v `correctCount` řadí až za ty, kteří už odpověděli — ve variantě
 * `considerSpeed` platí totéž (chybějící čistý čas = "nekonečno").
 */
export function rankParticipants<T extends ScoreInput>(
  participants: T[],
  options: RankOptions = {}
): RankedParticipant<T>[] {
  const { considerSpeed = false } = options;

  const sorted = [...participants].sort((a, b) => {
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;

    if (considerSpeed) {
      const aNet = netCompetingTimeMs(a) ?? Number.POSITIVE_INFINITY;
      const bNet = netCompetingTimeMs(b) ?? Number.POSITIVE_INFINITY;
      if (aNet !== bNet) return aNet - bNet;
    } else {
      const aLast = a.lastAnswerAt ? a.lastAnswerAt.getTime() : Number.POSITIVE_INFINITY;
      const bLast = b.lastAnswerAt ? b.lastAnswerAt.getTime() : Number.POSITIVE_INFINITY;
      if (aLast !== bLast) return aLast - bLast;
    }

    return a.registeredAt.getTime() - b.registeredAt.getTime();
  });

  return sorted.map((participant, index) => ({ rank: index + 1, participant }));
}

/** Bezpečné dělení pro procenta úspěšnosti — 0 jmenovatel vrací 0, ne NaN. */
export function successRate(correct: number, total: number): number {
  if (total <= 0) return 0;
  return (correct / total) * 100;
}

/**
 * B.2 — časové metriky. Všechny vrací `null`, když nejde spočítat (žádná
 * odpověď, jen jedna odpověď u průměru mezi odpověďmi apod.) — nikdy `NaN`
 * ani zápornou hodnotu.
 */

/** Čistý čas soutěžení: lastAnswerAt − firstAnswerAt. */
export function netCompetingTimeMs(input: {
  firstAnswerAt: Date | null;
  lastAnswerAt: Date | null;
}): number | null {
  if (!input.firstAnswerAt || !input.lastAnswerAt) return null;
  return input.lastAnswerAt.getTime() - input.firstAnswerAt.getTime();
}

/**
 * Celkový čas: lastAnswerAt − registeredAt. Záměrně NENÍ použit pro pořadí
 * (viz vysvětlivka nad tabulkou v UI a README) — trestá by účastníky, kteří
 * se zaregistrovali dřív, ale se soutěží začali později.
 */
export function totalTimeMs(input: { registeredAt: Date; lastAnswerAt: Date | null }): number | null {
  if (!input.lastAnswerAt) return null;
  return input.lastAnswerAt.getTime() - input.registeredAt.getTime();
}

/** Průměrný čas mezi odpověďmi: čistý čas ÷ (počet odpovědí − 1). */
export function avgTimeBetweenAnswersMs(input: {
  firstAnswerAt: Date | null;
  lastAnswerAt: Date | null;
  answeredCount: number;
}): number | null {
  if (input.answeredCount <= 1) return null;
  const net = netCompetingTimeMs(input);
  if (net === null) return null;
  return net / (input.answeredCount - 1);
}
