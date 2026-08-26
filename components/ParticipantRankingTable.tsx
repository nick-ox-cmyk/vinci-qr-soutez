"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/DataTable";
import { rankParticipants, successRate, netCompetingTimeMs, totalTimeMs, avgTimeBetweenAnswersMs } from "@/lib/scoring";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { ParticipantAgg } from "@/lib/stats";

interface RankedRow extends ParticipantAgg {
  rank: number;
}

const LANGUAGE_LABELS: Record<string, string> = { cs: "cs", hu: "hu", pl: "pl" };

export function ParticipantRankingTable({ participants, token }: { participants: ParticipantAgg[]; token: string }) {
  const [considerSpeed, setConsiderSpeed] = useState(false);

  const rows: RankedRow[] = useMemo(
    () =>
      rankParticipants(participants, { considerSpeed }).map(({ rank, participant }) => ({
        ...participant,
        rank,
      })),
    [participants, considerSpeed]
  );

  const columns: Column<RankedRow>[] = [
    { key: "rank", header: "#", accessor: (r) => r.rank },
    {
      key: "fullName",
      header: "Jméno",
      accessor: (r) => r.fullName,
      render: (r) => (
        <Link href={`/r/${token}/u/${r.participantId}`} className="text-vinci-blue underline-offset-2 hover:underline">
          {r.fullName}
        </Link>
      ),
    },
    { key: "companyName", header: "Firma", accessor: (r) => r.companyName },
    { key: "language", header: "Jazyk", accessor: (r) => LANGUAGE_LABELS[r.language] ?? r.language },
    { key: "answeredCount", header: "Zodpovězeno", accessor: (r) => r.answeredCount },
    { key: "correctCount", header: "Správně", accessor: (r) => r.correctCount },
    { key: "incorrectCount", header: "Chybně", accessor: (r) => r.answeredCount - r.correctCount },
    {
      key: "successRate",
      header: "Úspěšnost",
      accessor: (r) => Math.round(successRate(r.correctCount, r.answeredCount)),
      render: (r) => `${Math.round(successRate(r.correctCount, r.answeredCount))} %`,
    },
    {
      key: "firstAnswerAt",
      header: "První odpověď",
      accessor: (r) => (r.firstAnswerAt ? r.firstAnswerAt.getTime() : 0),
      render: (r) => formatDateTime(r.firstAnswerAt),
    },
    {
      key: "lastAnswerAt",
      header: "Poslední odpověď",
      accessor: (r) => (r.lastAnswerAt ? r.lastAnswerAt.getTime() : 0),
      render: (r) => formatDateTime(r.lastAnswerAt),
    },
    {
      key: "netTime",
      header: "Čistý čas",
      accessor: (r) => netCompetingTimeMs(r) ?? Number.POSITIVE_INFINITY,
      render: (r) => formatDuration(netCompetingTimeMs(r)),
    },
    {
      key: "totalTime",
      header: "Celkový čas",
      accessor: (r) => totalTimeMs(r) ?? Number.POSITIVE_INFINITY,
      render: (r) => formatDuration(totalTimeMs(r)),
    },
    {
      key: "avgBetween",
      header: "Prům. mezi odpověďmi",
      accessor: (r) => avgTimeBetweenAnswersMs(r) ?? Number.POSITIVE_INFINITY,
      render: (r) => formatDuration(avgTimeBetweenAnswersMs(r)),
    },
    { key: "reclaimCount", header: "Převzetí", accessor: (r) => r.reclaimCount },
  ];

  return (
    <div>
      <label className="mb-3 flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-vinci-blue-ink">
        <input
          type="checkbox"
          checked={considerSpeed}
          onChange={(e) => setConsiderSpeed(e.target.checked)}
          className="h-4 w-4"
        />
        Zohlednit rychlost
        <span className="text-text-muted">(při shodě správných odpovědí řadí podle čistého času soutěžení)</span>
      </label>
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.participantId}
        searchPlaceholder="Hledat jméno nebo firmu…"
        defaultSortKey="rank"
      />
    </div>
  );
}
