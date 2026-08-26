/**
 * Vše se ukládá v UTC (Postgres `timestamptz`), zobrazuje se v Europe/Prague
 * (B.1). Čistá funkce — žádná závislost na běhovém prostředí serveru
 * (Vercel serverless běží v UTC, takže bez explicitního `timeZone` by se
 * časy zobrazovaly špatně).
 */
export const APP_TIME_ZONE = "Europe/Prague";

const dateTimeFormatter = new Intl.DateTimeFormat("cs-CZ", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: APP_TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat("cs-CZ", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: APP_TIME_ZONE,
});

export function formatDateTime(date: Date | null): string {
  if (!date) return "—";
  return dateTimeFormatter.format(date);
}

export function formatTime(date: Date | null): string {
  if (!date) return "—";
  return timeFormatter.format(date);
}

/**
 * `ms` → "1 h 24 min" / "3 min 12 s" / "45 s". `null` (chybí dost dat pro
 * výpočet — viz lib/scoring.ts) se zobrazí jako „—", ne jako chyba.
 */
export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return "—";

  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${seconds} s`;
  return `${seconds} s`;
}
