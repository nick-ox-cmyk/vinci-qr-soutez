"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getParticipantId } from "@/lib/session";
import { submitAnswerRateLimiter } from "@/lib/ratelimit";

const schema = z.object({
  slug: z.string().min(1),
  selectedOption: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export type SubmitAnswerResult =
  | { status: "saved"; answeredCount: number; totalQuestions: number }
  | { status: "already_answered"; answeredCount: number; totalQuestions: number }
  | { status: "error"; error: "NO_SESSION" | "INVALID_INPUT" | "NOT_FOUND" | "RATE_LIMITED" };

/**
 * §6.2 — veškerá validace jen na serveru, klientu se nevěří nic.
 * `correctOption` / `isCorrect` se v návratové hodnotě NIKDY neposílá.
 */
export async function submitAnswer(slug: string, selectedOption: number): Promise<SubmitAnswerResult> {
  const parsed = schema.safeParse({ slug, selectedOption });
  if (!parsed.success) return { status: "error", error: "INVALID_INPUT" };

  const participantId = await getParticipantId();
  if (!participantId) return { status: "error", error: "NO_SESSION" };

  const { success } = submitAnswerRateLimiter.check(participantId);
  if (!success) return { status: "error", error: "RATE_LIMITED" };

  const question = await prisma.question.findUnique({ where: { slug: parsed.data.slug } });
  // Neexistující i neaktivní otázka reaguje stejně — žádné rozlišování (§4).
  if (!question || !question.active) return { status: "error", error: "NOT_FOUND" };

  const isCorrect = parsed.data.selectedOption === question.correctOption;

  try {
    // Zápis odpovědi a aktualizace Participant.firstAnswerAt/lastAnswerAt
    // musí být v JEDNÉ transakci (B.1) — a čas bere transakce vždy z DB
    // (`answeredAt` je `@default(now())`), nikdy z hodin Node serveru a už
    // vůbec ne z klienta, který je nedůvěryhodný a dá se zfalšovat.
    await prisma.$transaction(async (tx) => {
      const answer = await tx.answer.create({
        data: {
          participantId,
          questionId: question.id,
          selectedOption: parsed.data.selectedOption,
          isCorrect,
        },
      });

      // COALESCE přímo v SQL — firstAnswerAt se nastaví jen napoprvé,
      // lastAnswerAt a lastSeenAt vždy na čas TÉTO odpovědi. Jeden atomický
      // příkaz, žádné dodatečné čtení a žádná závodní podmínka.
      await tx.$executeRaw`
        UPDATE "Participant"
        SET "firstAnswerAt" = COALESCE("firstAnswerAt", ${answer.answeredAt}),
            "lastAnswerAt" = ${answer.answeredAt},
            "lastSeenAt" = ${answer.answeredAt}
        WHERE id = ${participantId}
      `;
    });
  } catch (err) {
    // Databázový unique constraint (participantId, questionId) je jediná
    // spolehlivá ochrana proti dvojité odpovědi — ne předchozí SELECT, který
    // by u dvojkliku / dvou záložek byl závodní podmínkou (§6.2).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const [answeredCount, totalQuestions] = await Promise.all([
        prisma.answer.count({ where: { participantId } }),
        prisma.question.count({ where: { active: true } }),
      ]);
      return { status: "already_answered", answeredCount, totalQuestions };
    }
    throw err;
  }

  revalidatePath(`/q/${parsed.data.slug}`);

  const [answeredCount, totalQuestions] = await Promise.all([
    prisma.answer.count({ where: { participantId } }),
    prisma.question.count({ where: { active: true } }),
  ]);

  return { status: "saved", answeredCount, totalQuestions };
}
