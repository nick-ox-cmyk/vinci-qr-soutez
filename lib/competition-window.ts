import type { Language } from "@prisma/client";

/**
 * QR kódy visí den dopředu, ale soutěž se smí odpovídat jen v daném okně.
 * Start/konec jsou jeden konkrétní okamžik v UTC — zobrazují se ale
 * v místním čase každého jazyka (Rumunsko/Bulharsko jsou v EEST, o hodinu
 * napřed před CEST, takže stejný UTC okamžik tam vychází na 9:00 / 17:00
 * misto 8:00 / 16:00 — nic se nedopočítává ručně, jen se vybere správná
 * časová zóna pro formátování).
 *
 * Přepsatelné přes env (ISO 8601 UTC), pro případ posunu data akce beze
 * změny kódu.
 */
const DEFAULT_START_AT = "2026-09-14T06:00:00.000Z"; // 14. 9. 8:00 CEST / 9:00 EEST
const DEFAULT_END_AT = "2026-09-18T14:00:00.000Z"; // 18. 9. 16:00 CEST / 17:00 EEST

export function getCompetitionStart(): Date {
  return new Date(process.env.COMPETITION_START_AT ?? DEFAULT_START_AT);
}

export function getCompetitionEnd(): Date {
  return new Date(process.env.COMPETITION_END_AT ?? DEFAULT_END_AT);
}

export type CompetitionPhase = "before" | "open" | "after";

/** Čistá funkce (žádné env / DB) — snadno testovatelná. */
export function resolveCompetitionPhase(now: Date, start: Date, end: Date): CompetitionPhase {
  if (now < start) return "before";
  if (now > end) return "after";
  return "open";
}

export function getCompetitionPhase(now: Date = new Date()): CompetitionPhase {
  return resolveCompetitionPhase(now, getCompetitionStart(), getCompetitionEnd());
}

const LOCALE_TIMEZONE: Record<Language, { locale: string; timeZone: string }> = {
  cs: { locale: "cs-CZ", timeZone: "Europe/Prague" },
  sk: { locale: "sk-SK", timeZone: "Europe/Bratislava" },
  pl: { locale: "pl-PL", timeZone: "Europe/Warsaw" },
  hu: { locale: "hu-HU", timeZone: "Europe/Budapest" },
  ro: { locale: "ro-RO", timeZone: "Europe/Bucharest" },
  bg: { locale: "bg-BG", timeZone: "Europe/Sofia" },
  en: { locale: "en-GB", timeZone: "Europe/Prague" },
};

/** Naformátuje datum/čas v místní zóně daného jazyka, např. "14. září, 8:00". */
export function formatCompetitionDateTime(date: Date, language: Language): string {
  const { locale, timeZone } = LOCALE_TIMEZONE[language] ?? LOCALE_TIMEZONE.en;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}
