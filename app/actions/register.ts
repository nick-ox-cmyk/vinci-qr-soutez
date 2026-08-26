"use server";

import { z } from "zod";
import type { Language } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { setParticipantCookie } from "@/lib/session";

const schema = z.object({ employeeId: z.string().min(1) });

export type RegisterResult =
  | { ok: true; language: Language; reclaimed: boolean }
  | { ok: false; error: "INVALID_INPUT" | "EMPLOYEE_NOT_FOUND" };

/**
 * §5.1 krok 5–6. Vytvoří (nebo najde existující) Participant, nastaví
 * podepsanou cookie. Existující Participant = převzetí identity na jiném
 * zařízení / po ztrátě cookie (§5.3) — zvýší se `reclaimCount`, dosavadní
 * odpovědi zůstávají.
 */
export async function registerParticipant(employeeId: string): Promise<RegisterResult> {
  const parsed = schema.safeParse({ employeeId });
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const employee = await prisma.employee.findUnique({
    where: { id: parsed.data.employeeId },
    include: { participant: true },
  });
  if (!employee) return { ok: false, error: "EMPLOYEE_NOT_FOUND" };

  let participantId: string;
  let reclaimed: boolean;

  if (employee.participant) {
    const updated = await prisma.participant.update({
      where: { id: employee.participant.id },
      data: { reclaimCount: { increment: 1 }, lastSeenAt: new Date() },
    });
    participantId = updated.id;
    reclaimed = true;
  } else {
    const created = await prisma.participant.create({
      data: { employeeId: employee.id, language: employee.language },
    });
    participantId = created.id;
    reclaimed = false;
  }

  await setParticipantCookie(participantId);
  // Žádné jméno v návratové hodnotě/logu — jen jazyk a příznak převzetí,
  // klient si zbytek pamatuje z předchozího kroku (§8 — žádné logování jmen).
  return { ok: true, language: employee.language, reclaimed };
}
