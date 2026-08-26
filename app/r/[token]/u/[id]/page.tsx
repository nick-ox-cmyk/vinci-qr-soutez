import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isValidAdminUrlToken, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { successRate } from "@/lib/scoring";

const dateFormatter = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short" });

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;

  if (!isValidAdminUrlToken(token)) notFound();
  if (!(await isAdmin())) redirect(`/r/${token}/login`);

  const participant = await prisma.participant.findUnique({
    where: { id },
    include: {
      employee: { include: { company: true } },
      answers: { include: { question: true } },
    },
  });
  if (!participant) notFound();

  const questions = await prisma.question.findMany({
    where: { active: true },
    include: { translations: { where: { language: "cs" } } },
    orderBy: { number: "asc" },
  });

  const answerByQuestionId = new Map(participant.answers.map((a) => [a.questionId, a]));
  const correctCount = participant.answers.filter((a) => a.isCorrect).length;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link href={`/r/${token}`} className="text-sm text-vinci-blue hover:underline">
        ← Zpět na přehled
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-vinci-blue">{participant.employee.fullName}</h1>
      <p className="text-text-muted">
        {participant.employee.company.name} · jazyk {participant.language}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-3">
          <dt className="text-xs text-text-muted">Zodpovězeno</dt>
          <dd className="text-lg font-bold text-vinci-blue">
            {participant.answers.length} / {questions.length}
          </dd>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-3">
          <dt className="text-xs text-text-muted">Správně</dt>
          <dd className="text-lg font-bold text-vinci-blue">{correctCount}</dd>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-3">
          <dt className="text-xs text-text-muted">Úspěšnost</dt>
          <dd className="text-lg font-bold text-vinci-blue">{successRate(correctCount, participant.answers.length).toFixed(0)} %</dd>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-3">
          <dt className="text-xs text-text-muted">Převzetí identity</dt>
          <dd className="text-lg font-bold text-vinci-blue">{participant.reclaimCount}</dd>
        </div>
      </dl>

      <p className="mt-3 text-sm text-text-muted">
        Registrace: {dateFormatter.format(participant.registeredAt)} · poslední aktivita:{" "}
        {dateFormatter.format(participant.lastSeenAt)}
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead className="bg-surface-muted">
            <tr>
              <th className="border-b border-border px-3 py-2 text-left">Č.</th>
              <th className="border-b border-border px-3 py-2 text-left">Otázka</th>
              <th className="border-b border-border px-3 py-2 text-left">Jeho odpověď</th>
              <th className="border-b border-border px-3 py-2 text-left">Správná odpověď</th>
              <th className="border-b border-border px-3 py-2 text-center">✓/✗</th>
              <th className="border-b border-border px-3 py-2 text-left">Čas</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => {
              const answer = answerByQuestionId.get(q.id);
              const t = q.translations[0];
              const optionText = (n: number) => (t ? [t.option1, t.option2, t.option3][n - 1] : `#${n}`);
              return (
                <tr key={q.id} className={`border-b border-border last:border-0 ${answer ? "" : "text-text-muted"}`}>
                  <td className="px-3 py-2">{q.number}</td>
                  <td className="px-3 py-2">{t?.text ?? "—"}</td>
                  <td className="px-3 py-2">{answer ? optionText(answer.selectedOption) : "nezodpovězeno"}</td>
                  <td className="px-3 py-2">{optionText(q.correctOption)}</td>
                  <td className="px-3 py-2 text-center">{answer ? (answer.isCorrect ? "✓" : "✗") : "—"}</td>
                  <td className="px-3 py-2">{answer ? dateFormatter.format(answer.answeredAt) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
