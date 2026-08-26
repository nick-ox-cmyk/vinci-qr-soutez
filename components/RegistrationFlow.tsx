"use client";

import { useState, useTransition } from "react";
import { EmployeeSearch } from "@/components/EmployeeSearch";
import { Button } from "@/components/Button";
import { SetHtmlLang } from "@/components/SetHtmlLang";
import { getDictionary, t, SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { getEmployeeConfirmation } from "@/app/actions/employees";
import { registerParticipant } from "@/app/actions/register";
import type { EmployeeSearchResultDTO } from "@/lib/dto";
import type { Language } from "@prisma/client";

type Step = "search" | "confirm" | "done";

/**
 * Registrační průběh (§5.1) — používá se jak na `/` (mode="home"), tak
 * inline na `/q/[slug]` při ztrátě session (mode="inline", §5.3).
 */
export function RegistrationFlow({
  mode,
  onRegistered,
}: {
  mode: "home" | "inline";
  onRegistered?: () => void;
}) {
  const [step, setStep] = useState<Step>("search");
  const [switcherLang, setSwitcherLang] = useState<Language>("cs");
  const [selected, setSelected] = useState<{ employeeId: string; fullName: string; companyName: string; language: Language } | null>(
    null
  );
  const [reclaimed, setReclaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const searchDict = getDictionary(switcherLang);
  const activeDict = selected ? getDictionary(selected.language) : searchDict;
  const activeLang: Language = selected ? selected.language : switcherLang;

  async function handleSelect(employee: EmployeeSearchResultDTO) {
    setError(null);
    const preview = await getEmployeeConfirmation(employee.id);
    if (!preview) {
      setError(searchDict.register.notFoundHelp);
      return;
    }
    setSelected(preview);
    setStep("confirm");
  }

  function handleConfirm() {
    if (!selected) return;
    startTransition(async () => {
      const result = await registerParticipant(selected.employeeId);
      if (!result.ok) {
        setError("Něco se nepovedlo. Zkus to prosím znovu.");
        return;
      }
      setReclaimed(result.reclaimed);
      if (mode === "inline") {
        onRegistered?.();
      } else {
        setStep("done");
      }
    });
  }

  function handleBack() {
    setSelected(null);
    setStep("search");
    setError(null);
  }

  return (
    <div>
      <SetHtmlLang lang={activeLang} />

      {step === "search" && (
        <div className="space-y-4">
          {/* Jazyk ještě neznáme — zaměstnance jsme nedohledali (§10). Přepínač
              patří na obě místa, kde se hledá jméno: registraci i inline
              identifikaci při ztrátě session na /q/[slug]. */}
          <div className="flex justify-center gap-2" role="group" aria-label="Jazyk / Nyelv / Język">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setSwitcherLang(lang)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold uppercase transition-colors ${
                  switcherLang === lang
                    ? "bg-vinci-blue text-white"
                    : "border border-border bg-surface text-vinci-blue-ink"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          {mode === "home" && (
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-eco-teal">{searchDict.register.eyebrow}</p>
              <p className="mt-1 text-vinci-blue-ink">{searchDict.register.intro}</p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-vinci-blue-ink">
              {mode === "inline" ? searchDict.question.identifyFirst : searchDict.register.searchLabel}
            </label>
            <EmployeeSearch
              onSelect={handleSelect}
              placeholder={searchDict.register.searchPlaceholder}
              emptyLabel={searchDict.register.searchEmpty}
              loadingLabel={searchDict.register.searchLoading}
              autoFocus={mode === "inline"}
            />
          </div>

          {error && <p className="text-sm text-vinci-red">{error}</p>}

          <p className="text-sm text-text-muted">{searchDict.register.notFoundHelp}</p>
        </div>
      )}

      {step === "confirm" && selected && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-vinci-blue">{activeDict.register.confirmHeading}</h2>
            <div className="mt-3 rounded-2xl border border-border bg-surface-muted p-4">
              <div className="text-lg font-semibold text-vinci-blue-ink">{selected.fullName}</div>
              <div className="text-sm text-text-muted">{selected.companyName}</div>
              <div className="mt-2 text-sm text-vinci-blue-ink">
                {activeDict.register.yourLanguage}: <strong>{t(activeDict, `languages.${selected.language}`)}</strong>
              </div>
            </div>
          </div>

          <p className="text-xs text-text-muted">{activeDict.register.gdprNotice}</p>
          <p className="text-xs text-text-muted">{activeDict.common.browserTip}</p>

          {error && <p className="text-sm text-vinci-red">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Button variant="primary" onClick={handleConfirm} disabled={isPending} className="w-full">
              {isPending ? "…" : activeDict.register.confirmButton}
            </Button>
            <Button variant="ghost" onClick={handleBack} disabled={isPending} className="w-full">
              {activeDict.register.backButton}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && selected && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-wenow-green-soft">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7" stroke="var(--wenow-green-dark)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-vinci-blue">
            {reclaimed ? activeDict.register.welcomeBack : activeDict.register.doneTitle}
          </h2>
          <p className="text-vinci-blue-ink">{activeDict.register.doneBody}</p>
        </div>
      )}
    </div>
  );
}
