import { NextRequest, NextResponse } from "next/server";
import { isValidAdminUrlToken, isAdmin } from "@/lib/session";
import { getParticipantAggregates, getQuestionAggregates } from "@/lib/results";
import { rankParticipants, successRate } from "@/lib/scoring";
import { computeQuestionStats } from "@/lib/stats";
import { prisma } from "@/lib/prisma";

// CSV s BOM a středníkem jako oddělovačem, aby se korektně otevřelo v českém
// Excelu (§7.5).
const BOM = "﻿";

function toCsvValue(v: string | number): string {
  const s = String(v);
  if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(toCsvValue).join(";"));
  return BOM + lines.join("\r\n") + "\r\n";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string; file: string }> }) {
  const { token, file } = await params;

  if (!isValidAdminUrlToken(token)) return new NextResponse("Not found", { status: 404 });
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });

  let csv: string;
  let filename: string;

  if (file === "poradi.csv") {
    const participants = await getParticipantAggregates();
    const ranked = rankParticipants(participants);
    csv = buildCsv(
      ["pořadí", "jméno", "firma", "jazyk", "zodpovězeno", "správně", "chybně", "úspěšnost %", "poslední odpověď", "převzetí"],
      ranked.map(({ rank, participant: p }) => [
        rank,
        p.fullName,
        p.companyName,
        p.language,
        p.answeredCount,
        p.correctCount,
        p.answeredCount - p.correctCount,
        successRate(p.correctCount, p.answeredCount).toFixed(1),
        p.lastAnswerAt ? p.lastAnswerAt.toISOString() : "",
        p.reclaimCount,
      ])
    );
    filename = "vysledky-poradi.csv";
  } else if (file === "odpovedi.csv") {
    const answers = await prisma.answer.findMany({
      include: { participant: { include: { employee: true } }, question: true },
      orderBy: { answeredAt: "asc" },
    });
    csv = buildCsv(
      ["participant_id", "jméno", "otázka č.", "volba", "správně", "čas"],
      answers.map((a) => [
        a.participantId,
        a.participant.employee.fullName,
        a.question.number,
        a.selectedOption,
        a.isCorrect ? "ano" : "ne",
        a.answeredAt.toISOString(),
      ])
    );
    filename = "vysledky-odpovedi.csv";
  } else if (file === "otazky.csv") {
    const questions = await getQuestionAggregates();
    const stats = computeQuestionStats(questions);
    csv = buildCsv(
      ["č.", "text (cs)", "odpovědí", "správně", "úspěšnost %", "volba 1", "volba 2", "volba 3"],
      stats.map((q) => [
        q.number,
        q.textShort,
        q.answeredCount,
        q.correctCount,
        q.successRate.toFixed(1),
        q.option1Count,
        q.option2Count,
        q.option3Count,
      ])
    );
    filename = "vysledky-otazky.csv";
  } else {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
