"use client";

import { useState } from "react";
import { AnswerCard } from "@/components/AnswerCard";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { t, type Dictionary } from "@/lib/i18n";
import { submitAnswer } from "@/app/actions/answer";
import type { QuestionDTO } from "@/lib/dto";

type ViewState = "unanswered" | "confirming" | "submitting" | "saved" | "already_answered";

export function QuestionView({
  question,
  dict,
  answeredCount,
  totalQuestions,
  existingAnswer,
}: {
  question: QuestionDTO;
  dict: Dictionary;
  answeredCount: number;
  totalQuestions: number;
  existingAnswer: { selectedOption: number } | null;
}) {
  const [state, setState] = useState<ViewState>(existingAnswer ? "already_answered" : "unanswered");
  const [selected, setSelected] = useState<number | null>(existingAnswer?.selectedOption ?? null);
  const [counts, setCounts] = useState({ answeredCount, totalQuestions });
  const [error, setError] = useState<string | null>(null);

  const options = [
    { value: 1, label: question.option1 },
    { value: 2, label: question.option2 },
    { value: 3, label: question.option3 },
  ];

  async function handleConfirmSubmit() {
    if (selected === null) return;
    setState("submitting");
    setError(null);
    const result = await submitAnswer(question.slug, selected);
    if (result.status === "saved") {
      setCounts({ answeredCount: result.answeredCount, totalQuestions: result.totalQuestions });
      setState("saved");
    } else if (result.status === "already_answered") {
      setCounts({ answeredCount: result.answeredCount, totalQuestions: result.totalQuestions });
      setState("already_answered");
    } else {
      setError("Něco se nepovedlo. Zkus to prosím znovu.");
      setState("unanswered");
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <div className="mb-1 flex items-baseline justify-between text-sm font-semibold text-vinci-blue-ink">
          <span>{t(dict, "question.questionLabel", { number: question.number })}</span>
          <span className="text-text-muted">{t(dict, "question.progressLabel", { answered: counts.answeredCount, total: counts.totalQuestions })}</span>
        </div>
        <ProgressBar value={counts.answeredCount} max={counts.totalQuestions} label="Progress soutěže" />
      </div>

      <Card roundedCorner className="flex-1 p-6">
        {(state === "unanswered" || state === "confirming" || state === "submitting") && (
          <div className="flex h-full flex-col gap-6">
            <p className="text-xl font-semibold leading-snug text-vinci-blue-ink sm:text-2xl">{question.text}</p>

            <div role="radiogroup" aria-label={question.text} className="flex flex-col gap-3">
              {options.map((opt) => (
                <AnswerCard
                  key={opt.value}
                  label={opt.label}
                  selected={selected === opt.value}
                  disabled={state === "submitting"}
                  onSelect={() => setSelected(opt.value)}
                />
              ))}
            </div>

            {error && <p className="text-sm text-vinci-red">{error}</p>}

            <div className="sticky bottom-0 mt-auto -mx-6 -mb-6 border-t border-border bg-surface px-6 py-4 pb-safe">
              <Button
                variant="primary"
                className="w-full"
                disabled={selected === null || state === "submitting"}
                onClick={() => setState("confirming")}
              >
                {dict.question.submitButton}
              </Button>
            </div>
          </div>
        )}

        {state === "already_answered" && (
          <div className="flex h-full flex-col gap-6">
            <p className="text-xl font-semibold leading-snug text-vinci-blue-ink sm:text-2xl">{question.text}</p>
            <p className="font-medium text-vinci-blue-ink">{dict.question.alreadyAnsweredTitle}</p>
            <div className="flex flex-col gap-3">
              {options.map((opt) => (
                <AnswerCard key={opt.value} label={opt.label} selected={selected === opt.value} disabled />
              ))}
            </div>
            <p className="text-sm text-text-muted">{dict.question.alreadyAnsweredHint}</p>
          </div>
        )}

        {state === "saved" && (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-wenow-green-soft">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7" stroke="var(--wenow-green-dark)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-vinci-blue">{dict.question.savedTitle}</h2>
            <p className="text-vinci-blue-ink">
              {t(dict, "question.savedProgress", { answered: counts.answeredCount, total: counts.totalQuestions })}
            </p>
            <p className="text-sm text-text-muted">{dict.question.savedHint}</p>
          </div>
        )}
      </Card>

      {state === "confirming" && selected !== null && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-vinci-blue-ink/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl bg-surface p-6 pb-safe shadow-lg sm:rounded-3xl">
            <p className="text-lg font-bold text-vinci-blue-ink">{dict.question.confirmTitle}</p>
            <p className="mt-1 text-vinci-blue-ink">{dict.question.confirmBody}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
              <Button variant="primary" className="w-full" onClick={handleConfirmSubmit}>
                {dict.question.confirmSubmit}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setState("unanswered")}>
                {dict.question.confirmCancel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
