"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { SetHtmlLang } from "@/components/SetHtmlLang";
import { getDictionary, t, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from "@/lib/i18n";
import { formatCompetitionDateTime } from "@/lib/competition-window";
import type { Language } from "@prisma/client";

/**
 * Zobrazí se místo registrace / otázky mimo časové okno soutěže. Pokud už
 * známe jazyk účastníka (má session), přepínač se neukazuje — jinak ano,
 * stejně jako na registraci.
 */
export function CompetitionLockedScreen({
  phase,
  date,
  knownLanguage,
}: {
  phase: "before" | "after";
  /** Start soutěže (phase="before") nebo konec (phase="after"). */
  date: Date;
  knownLanguage?: Language;
}) {
  const [switcherLang, setSwitcherLang] = useState<Language>(knownLanguage ?? DEFAULT_LANGUAGE);
  const dict = getDictionary(switcherLang);

  const title = phase === "before" ? dict.locked.tooEarlyTitle : dict.locked.tooLateTitle;
  const body =
    phase === "before"
      ? t(dict, "locked.tooEarlyBody", { datetime: formatCompetitionDateTime(date, switcherLang) })
      : dict.locked.tooLateBody;

  return (
    <main className="flex flex-1 flex-col items-start justify-start px-4 py-10">
      <SetHtmlLang lang={switcherLang} />
      <Card className="mx-auto w-full max-w-md p-6">
        {!knownLanguage && (
          <div className="mb-6 flex justify-center gap-2" role="group" aria-label="Jazyk / Language">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setSwitcherLang(lang)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold uppercase transition-colors ${
                  switcherLang === lang
                    ? "bg-vinci-blue text-white"
                    : "border border-border bg-surface text-vinci-blue-ink"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        )}

        <div className="text-center">
          <h1 className="text-2xl font-bold text-vinci-blue">{title}</h1>
          <p className="mt-3 text-vinci-blue-ink">{body}</p>
        </div>
      </Card>
    </main>
  );
}
