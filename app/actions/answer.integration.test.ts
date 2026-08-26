import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { submitAnswer } from "./answer";

/**
 * Integrační testy proti REÁLNÉ Postgres databázi (§13 — souběžná dvojitá
 * odeslání musí v DB vytvořit právě jeden Answer). Vyžadují `DATABASE_URL`
 * — lokálně `docker compose up -d`, pak `DATABASE_URL=... prisma migrate deploy`.
 * Bez DATABASE_URL se sada přeskočí (zbytek `npm test` dál běží zeleně).
 */
const hasDb = !!process.env.DATABASE_URL;

let currentParticipantId = "";
vi.mock("@/lib/session", () => ({
  getParticipantId: async () => currentParticipantId,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const prisma = new PrismaClient();

describe.skipIf(!hasDb)("submitAnswer — DB integrace", () => {
  let companyId: string;
  let employeeId: string;
  let participantId: string;
  let questionId: string;
  let slug: string;

  beforeAll(async () => {
    const unique = Date.now();
    const company = await prisma.company.create({ data: { name: `_test Co ${unique}` } });
    const employee = await prisma.employee.create({
      data: {
        fullName: `_Test Účastník ${unique}`,
        searchName: `test ucastnik ${unique}`,
        language: "cs",
        companyId: company.id,
      },
    });
    const participant = await prisma.participant.create({ data: { employeeId: employee.id, language: "cs" } });
    slug = `t${unique.toString(36).slice(-8)}`;
    const question = await prisma.question.create({
      data: {
        number: 900_000 + (unique % 1000),
        slug,
        correctOption: 2,
        translations: {
          create: [
            { language: "cs", text: "T?", option1: "a", option2: "b", option3: "c" },
            { language: "hu", text: "T?", option1: "a", option2: "b", option3: "c" },
            { language: "pl", text: "T?", option1: "a", option2: "b", option3: "c" },
          ],
        },
      },
    });

    companyId = company.id;
    employeeId = employee.id;
    participantId = participant.id;
    questionId = question.id;
    currentParticipantId = participantId;
  });

  afterAll(async () => {
    await prisma.answer.deleteMany({ where: { participantId } });
    await prisma.participant.delete({ where: { id: participantId } }).catch(() => {});
    await prisma.questionTranslation.deleteMany({ where: { questionId } }).catch(() => {});
    await prisma.question.delete({ where: { id: questionId } }).catch(() => {});
    await prisma.employee.delete({ where: { id: employeeId } }).catch(() => {});
    await prisma.company.delete({ where: { id: companyId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("saves an answer and computes isCorrect on the server", async () => {
    const result = await submitAnswer(slug, 2);
    expect(result.status).toBe("saved");

    const saved = await prisma.answer.findUniqueOrThrow({
      where: { participantId_questionId: { participantId, questionId } },
    });
    expect(saved.isCorrect).toBe(true);
    expect(saved.selectedOption).toBe(2);
  });

  it("a second submission for the same question returns already_answered and leaves the DB untouched", async () => {
    const before = await prisma.answer.count({ where: { participantId } });
    const result = await submitAnswer(slug, 1);
    expect(result.status).toBe("already_answered");

    const after = await prisma.answer.count({ where: { participantId } });
    expect(after).toBe(before);

    const saved = await prisma.answer.findUniqueOrThrow({
      where: { participantId_questionId: { participantId, questionId } },
    });
    expect(saved.selectedOption).toBe(2); // původní volba beze změny
  });

  it("concurrent double submission (Promise.all) creates exactly one Answer row", async () => {
    const unique = Date.now();
    const q2 = await prisma.question.create({
      data: {
        number: 800_000 + (unique % 1000),
        slug: `r${unique.toString(36).slice(-8)}`,
        correctOption: 1,
        translations: {
          create: [
            { language: "cs", text: "T2?", option1: "a", option2: "b", option3: "c" },
            { language: "hu", text: "T2?", option1: "a", option2: "b", option3: "c" },
            { language: "pl", text: "T2?", option1: "a", option2: "b", option3: "c" },
          ],
        },
      },
    });

    const [r1, r2] = await Promise.all([submitAnswer(q2.slug, 1), submitAnswer(q2.slug, 3)]);
    expect([r1.status, r2.status].sort()).toEqual(["already_answered", "saved"]);

    const count = await prisma.answer.count({ where: { participantId, questionId: q2.id } });
    expect(count).toBe(1);

    await prisma.answer.deleteMany({ where: { questionId: q2.id } });
    await prisma.questionTranslation.deleteMany({ where: { questionId: q2.id } });
    await prisma.question.delete({ where: { id: q2.id } });
  });
});
