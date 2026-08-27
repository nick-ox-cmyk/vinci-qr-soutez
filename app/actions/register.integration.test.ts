import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { registerParticipant } from "./register";

const hasDb = !!process.env.DATABASE_URL;

vi.mock("@/lib/session", () => ({ setParticipantCookie: async () => {} }));
// Tenhle test soubor cílí na registerParticipant/DB logiku, ne na časové okno
// soutěže (to má vlastní testy v lib/competition-window.test.ts) — vždy "open".
vi.mock("@/lib/competition-window", () => ({ getCompetitionPhase: () => "open" }));

const prisma = new PrismaClient();

describe.skipIf(!hasDb)("registerParticipant — DB integrace (§5.1, §5.3)", () => {
  let companyId: string;
  let employeeId: string;

  beforeAll(async () => {
    const unique = Date.now();
    const company = await prisma.company.create({ data: { name: `_test Register Co ${unique}` } });
    const employee = await prisma.employee.create({
      data: {
        fullName: `_Test Registrant ${unique}`,
        searchName: `test registrant ${unique}`,
        language: "hu",
        companyId: company.id,
      },
    });
    companyId = company.id;
    employeeId = employee.id;
  });

  afterAll(async () => {
    await prisma.answer.deleteMany({ where: { participant: { employeeId } } });
    await prisma.participant.deleteMany({ where: { employeeId } });
    await prisma.employee.delete({ where: { id: employeeId } });
    await prisma.company.delete({ where: { id: companyId } });
    await prisma.$disconnect();
  });

  it("creates a fresh Participant on first registration, copying the employee's language", async () => {
    const result = await registerParticipant(employeeId);
    expect(result).toEqual({ ok: true, language: "hu", reclaimed: false });

    const participant = await prisma.participant.findUniqueOrThrow({ where: { employeeId } });
    expect(participant.language).toBe("hu");
    expect(participant.reclaimCount).toBe(0);
  });

  it("registering the same employee again is a reclaim: increments reclaimCount, keeps the same Participant", async () => {
    const before = await prisma.participant.findUniqueOrThrow({ where: { employeeId } });

    const result = await registerParticipant(employeeId);
    expect(result).toEqual({ ok: true, language: "hu", reclaimed: true });

    const after = await prisma.participant.findUniqueOrThrow({ where: { employeeId } });
    expect(after.id).toBe(before.id); // stejný Participant, ne nový záznam
    expect(after.reclaimCount).toBe(before.reclaimCount + 1);
  });

  it("rejects an unknown employeeId without throwing", async () => {
    const result = await registerParticipant("does-not-exist");
    expect(result).toEqual({ ok: false, error: "EMPLOYEE_NOT_FOUND" });
  });
});
