"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/DataTable";
import { successRate } from "@/lib/scoring";
import type { ParticipantAgg } from "@/lib/stats";

export interface RankedRow extends ParticipantAgg {
  rank: number;
}

const LANGUAGE_LABELS: Record<string, string> = { cs: "cs", hu: "hu", pl: "pl" };
const dateFormatter = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short" });

export function ParticipantRankingTable({ rows, token }: { rows: RankedRow[]; token: string }) {
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
      key: "lastAnswerAt",
      header: "Poslední odpověď",
      accessor: (r) => (r.lastAnswerAt ? r.lastAnswerAt.getTime() : 0),
      render: (r) => (r.lastAnswerAt ? dateFormatter.format(r.lastAnswerAt) : "—"),
    },
    { key: "reclaimCount", header: "Převzetí", accessor: (r) => r.reclaimCount },
  ];

  return <DataTable columns={columns} rows={rows} getRowId={(r) => r.participantId} searchPlaceholder="Hledat jméno nebo firmu…" defaultSortKey="rank" />;
}
