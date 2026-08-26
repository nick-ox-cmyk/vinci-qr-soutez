import { notFound, redirect } from "next/navigation";
import { isValidAdminUrlToken, isAdmin } from "@/lib/session";
import { getParticipantAggregates, getQuestionAggregates, getAnswerTimestamps, getTotalQuestions } from "@/lib/results";
import { rankParticipants } from "@/lib/scoring";
import {
  computeKPI,
  computeCompanyStats,
  computeQuestionStats,
  computeHistogram,
  computeLanguageStats,
  computeTimeSeries,
} from "@/lib/stats";
import { StatTile } from "@/components/StatTile";
import { ParticipantRankingTable } from "@/components/ParticipantRankingTable";
import { OptionDistributionBar } from "@/components/OptionDistributionBar";
import {
  HistogramChart,
  QuestionSuccessChart,
  QuestionVolumeChart,
  LanguageChart,
  TimeSeriesChart,
} from "@/components/DashboardCharts";
import { adminLogout } from "@/app/actions/admin";

const dateFormatter = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short" });

export default async function ResultsDashboardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!isValidAdminUrlToken(token)) notFound();
  if (!(await isAdmin())) redirect(`/r/${token}/login`);

  const [participants, questions, answerTimestamps, totalQuestions] = await Promise.all([
    getParticipantAggregates(),
    getQuestionAggregates(),
    getAnswerTimestamps(),
    getTotalQuestions(),
  ]);

  const kpi = computeKPI(participants, totalQuestions);
  const companyStats = computeCompanyStats(participants);
  const questionStats = computeQuestionStats(questions);
  const histogram = computeHistogram(participants, totalQuestions);
  const languageStats = computeLanguageStats(participants);
  const timeSeries = computeTimeSeries(answerTimestamps, 15);

  const ranked = rankParticipants(participants).map(({ rank, participant }) => ({ ...participant, rank }));
  const winner = ranked[0];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vinci-blue">Výsledky — VINCI Environment Day</h1>
          <p className="text-sm text-text-muted">Aktualizováno při každém načtení stránky.</p>
        </div>
        <form action={adminLogout}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="rounded-full border border-border px-4 py-2 text-sm font-medium text-vinci-blue-ink hover:bg-surface-muted">
            Odhlásit
          </button>
        </form>
      </div>

      {/* KPI dlaždice */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Zaregistrovaní" value={kpi.totalParticipants} />
        <StatTile label="S ≥1 odpovědí" value={kpi.participantsWithAnswer} />
        <StatTile label="Dokončili soutěž" value={kpi.participantsCompleted} hint={`z ${totalQuestions} otázek`} />
        <StatTile label="Odpovědí celkem" value={kpi.totalAnswers} />
        <StatTile label="Průměr správných" value={kpi.avgCorrectPerParticipant.toFixed(1)} />
        <StatTile label="Celková úspěšnost" value={`${kpi.overallSuccessRate.toFixed(0)} %`} />
      </section>

      {/* Karta vítěze */}
      {winner && (
        <section className="mb-8 rounded-2xl border border-wenow-green bg-wenow-green-soft p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-vinci-blue-dark">🏆 Vítěz</p>
          <p className="mt-1 text-xl font-bold text-vinci-blue-dark">{winner.fullName}</p>
          <p className="text-sm text-vinci-blue-dark">{winner.companyName}</p>
          <p className="mt-2 text-sm text-vinci-blue-dark">
            {winner.correctCount} správných odpovědí
            {winner.lastAnswerAt ? ` · poslední odpověď ${dateFormatter.format(winner.lastAnswerAt)}` : ""}
          </p>
        </section>
      )}

      {/* Exporty */}
      <section className="mb-8 flex flex-wrap gap-3">
        <a href={`/r/${token}/export/poradi.csv`} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-vinci-blue-ink hover:bg-surface-muted">
          ⬇ vysledky-poradi.csv
        </a>
        <a href={`/r/${token}/export/odpovedi.csv`} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-vinci-blue-ink hover:bg-surface-muted">
          ⬇ vysledky-odpovedi.csv
        </a>
        <a href={`/r/${token}/export/otazky.csv`} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-vinci-blue-ink hover:bg-surface-muted">
          ⬇ vysledky-otazky.csv
        </a>
      </section>

      {/* Pořadí firem */}
      <section className="mb-8">
        <h2 className="mb-1 text-lg font-bold text-vinci-blue">Pořadí firem</h2>
        <p className="mb-3 text-sm text-text-muted">
          Řazeno primárně podle počtu správných odpovědí — u toho ale absolutní počet zvýhodňuje velké firmy, proto je
          vedle i procento úspěšnosti.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead className="bg-surface-muted">
              <tr>
                <th className="border-b border-border px-3 py-2 text-left">Firma</th>
                <th className="border-b border-border px-3 py-2 text-right">Účastníků</th>
                <th className="border-b border-border px-3 py-2 text-right">Zodpovězeno</th>
                <th className="border-b border-border px-3 py-2 text-right">Správně</th>
                <th className="border-b border-border px-3 py-2 text-right">Úspěšnost</th>
              </tr>
            </thead>
            <tbody>
              {companyStats.map((c) => (
                <tr key={c.companyName} className="border-b border-border last:border-0 odd:bg-surface even:bg-surface-muted/40">
                  <td className="px-3 py-2">{c.companyName}</td>
                  <td className="px-3 py-2 text-right">{c.participantCount}</td>
                  <td className="px-3 py-2 text-right">{c.answeredCount}</td>
                  <td className="px-3 py-2 text-right">{c.correctCount}</td>
                  <td className="px-3 py-2 text-right">{c.successRate.toFixed(0)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Celkové pořadí účastníků */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-vinci-blue">Celkové pořadí účastníků</h2>
        <ParticipantRankingTable rows={ranked} token={token} />
      </section>

      {/* Statistika otázek */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-vinci-blue">Statistika otázek</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-surface-muted">
              <tr>
                <th className="border-b border-border px-3 py-2 text-left">Č.</th>
                <th className="border-b border-border px-3 py-2 text-left">Text (cs)</th>
                <th className="border-b border-border px-3 py-2 text-right">Odpovědí</th>
                <th className="border-b border-border px-3 py-2 text-right">Správně</th>
                <th className="border-b border-border px-3 py-2 text-right">Úspěšnost</th>
                <th className="border-b border-border px-3 py-2 text-left">Rozložení 1/2/3</th>
              </tr>
            </thead>
            <tbody>
              {questionStats.map((q) => (
                <tr key={q.number} className="border-b border-border last:border-0 odd:bg-surface even:bg-surface-muted/40">
                  <td className="px-3 py-2">{q.number}</td>
                  <td className="px-3 py-2">{q.textShort}</td>
                  <td className="px-3 py-2 text-right">{q.answeredCount}</td>
                  <td className="px-3 py-2 text-right">{q.correctCount}</td>
                  <td className="px-3 py-2 text-right">{q.successRate.toFixed(0)} %</td>
                  <td className="px-3 py-2">
                    <OptionDistributionBar option1={q.option1Count} option2={q.option2Count} option3={q.option3Count} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grafy */}
      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="mb-2 font-semibold text-vinci-blue-ink">Histogram výsledků</h3>
          <HistogramChart data={histogram} />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="mb-2 font-semibold text-vinci-blue-ink">Výsledky podle jazyka</h3>
          <LanguageChart data={languageStats} />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 lg:col-span-2">
          <h3 className="mb-2 font-semibold text-vinci-blue-ink">Úspěšnost jednotlivých otázek</h3>
          <QuestionSuccessChart data={questionStats} />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="mb-2 font-semibold text-vinci-blue-ink">Počet odpovědí podle otázky</h3>
          <QuestionVolumeChart data={questionStats} />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="mb-2 font-semibold text-vinci-blue-ink">Odpovědi v čase (po 15 min)</h3>
          <TimeSeriesChart data={timeSeries} />
        </div>
      </section>
    </main>
  );
}
