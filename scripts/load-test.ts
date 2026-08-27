import "dotenv/config";
import { PrismaClient, type Language, type Company, type Question } from "@prisma/client";

/**
 * Zátěžový test DB vrstvy (§8 v README) proti IZOLOVANÉ Neon větvi — nikdy
 * ne proti produkci. Testuje přímo Prisma/Postgres vrstvu stejnými
 * dotazovými/transakčními vzory jako `app/actions/*.ts`, protože skutečný
 * sdílený bottleneck při 4000 účastnících je databáze, ne Next.js/Vercel
 * (ten škáluje elasticky per-request).
 *
 * Spuštění:
 *   DATABASE_URL="<pooled connection string izolované větve>" \
 *   LOAD_TEST_CONFIRM=yes-this-is-a-disposable-branch \
 *   npx tsx scripts/load-test.ts
 */

const CONFIRM = process.env.LOAD_TEST_CONFIRM;
if (CONFIRM !== "yes-this-is-a-disposable-branch") {
  console.error(
    "✗ Bezpečnostní pojistka: nastav LOAD_TEST_CONFIRM=yes-this-is-a-disposable-branch a DATABASE_URL na " +
      "ODDĚLENOU/zahazovatelnou Neon větev (ne produkci). Tenhle skript zapisuje tisíce testovacích řádků."
  );
  process.exit(1);
}

const EMPLOYEE_COUNT = Number(process.env.LOAD_TEST_EMPLOYEES ?? 4000);
const COMPANY_COUNT = 50;
const CONCURRENCY = Number(process.env.LOAD_TEST_CONCURRENCY ?? 200);
const LANGUAGES: Language[] = ["cs", "sk", "pl", "hu", "ro", "bg", "en"];
const NAME_PREFIX = "_LoadTest";

const prisma = new PrismaClient();

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

interface BatchResult {
  durations: number[];
  errors: number;
  totalMs: number;
}

async function runBatch<T>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<void>): Promise<BatchResult> {
  const durations: number[] = [];
  let errors = 0;
  let index = 0;
  const start = Date.now();

  async function worker() {
    while (index < items.length) {
      const i = index++;
      const t0 = Date.now();
      try {
        await fn(items[i], i);
        durations.push(Date.now() - t0);
      } catch {
        errors++;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return { durations, errors, totalMs: Date.now() - start };
}

function summarize(label: string, result: BatchResult) {
  const sorted = [...result.durations].sort((a, b) => a - b);
  const total = result.durations.length + result.errors;
  const throughput = result.totalMs > 0 ? (result.durations.length / (result.totalMs / 1000)).toFixed(1) : "—";
  console.log(`\n${label}`);
  console.log(`  požadavků: ${total}, úspěšných: ${result.durations.length}, chyb: ${result.errors}`);
  console.log(`  celkový čas: ${(result.totalMs / 1000).toFixed(1)} s, throughput: ${throughput} req/s`);
  if (sorted.length > 0) {
    console.log(
      `  latence — p50: ${percentile(sorted, 50)} ms, p95: ${percentile(sorted, 95)} ms, p99: ${percentile(sorted, 99)} ms, max: ${sorted[sorted.length - 1]} ms`
    );
  }
}

async function main() {
  const redactedUrl = (process.env.DATABASE_URL ?? "").replace(/:[^:@]+@/, ":***@");
  console.log(`Zátěžový test proti: ${redactedUrl}`);
  console.log(`Zaměstnanců: ${EMPLOYEE_COUNT}, souběžnost: ${CONCURRENCY}`);

  console.log("\nPřipravuji data (firmy, zaměstnanci, otázky)…");

  const companies: Company[] = [];
  for (let i = 0; i < COMPANY_COUNT; i++) {
    const name = `${NAME_PREFIX} Co ${i}`;
    companies.push(await prisma.company.upsert({ where: { name }, create: { name }, update: {} }));
  }

  const employeeData = Array.from({ length: EMPLOYEE_COUNT }, (_, i) => ({
    fullName: `${NAME_PREFIX} User ${i}`,
    searchName: `loadtest user ${i}`,
    language: LANGUAGES[i % LANGUAGES.length],
    companyId: companies[i % COMPANY_COUNT].id,
  }));
  await prisma.employee.createMany({ data: employeeData, skipDuplicates: true });

  const employees = await prisma.employee.findMany({
    where: { fullName: { startsWith: NAME_PREFIX } },
    select: { id: true },
  });

  const questions: Question[] = [];
  for (let n = 1; n <= 30; n++) {
    const number = 500_000 + n; // mimo rozsah ostrých čísel otázek
    const question = await prisma.question.upsert({
      where: { number },
      create: { number, slug: `loadtest${String(n).padStart(4, "0")}`, correctOption: (n % 3) + 1 },
      update: {},
    });
    questions.push(question);
  }
  console.log(`  ${companies.length} firem, ${employees.length} zaměstnanců, ${questions.length} otázek připraveno.`);

  // --- Test 1: souběžné vyhledávání (typeahead search, GET /api/employees/search) ---
  const searchJobs = Array.from({ length: 2000 });
  const searchResult = await runBatch(searchJobs, CONCURRENCY, async (_job, i) => {
    await prisma.employee.findMany({
      where: { searchName: { contains: `loadtest user ${i % 1000}` } },
      include: { company: true },
      orderBy: { fullName: "asc" },
      take: 8,
    });
  });
  summarize("1) Vyhledávání zaměstnanců (typeahead)", searchResult);

  // --- Test 2: souběžná registrace (Participant create, jádro registerParticipant) ---
  const registerResult = await runBatch(employees, CONCURRENCY, async (emp) => {
    await prisma.participant.upsert({
      where: { employeeId: emp.id },
      create: { employeeId: emp.id, language: "en" },
      update: {},
    });
  });
  summarize("2) Registrace (Participant create)", registerResult);

  const participants = await prisma.participant.findMany({
    where: { employee: { fullName: { startsWith: NAME_PREFIX } } },
    select: { id: true },
  });

  // --- Test 3: souběžné odesílání odpovědí — STEJNÝ transakční vzor jako submitAnswer ---
  // (create + COALESCE update firstAnswerAt/lastAnswerAt v jedné transakci)
  const answerJobs = participants.map((p, i) => ({ participantId: p.id, question: questions[i % questions.length] }));
  const answerResult = await runBatch(answerJobs, CONCURRENCY, async (job) => {
    await prisma.$transaction(async (tx) => {
      const answer = await tx.answer.create({
        data: {
          participantId: job.participantId,
          questionId: job.question.id,
          selectedOption: 1,
          isCorrect: job.question.correctOption === 1,
        },
      });
      await tx.$executeRaw`
        UPDATE "Participant"
        SET "firstAnswerAt" = COALESCE("firstAnswerAt", ${answer.answeredAt}),
            "lastAnswerAt" = ${answer.answeredAt},
            "lastSeenAt" = ${answer.answeredAt}
        WHERE id = ${job.participantId}
      `;
    });
  });
  summarize("3) Odpovědi (transakce shodná se submitAnswer)", answerResult);

  // --- Test 4: souběžné druhé odpovědi na TYTÉŽ otázky — musí selhat na unique constraintu ---
  const duplicateResult = await runBatch(answerJobs, CONCURRENCY, async (job) => {
    await prisma.$transaction(async (tx) => {
      await tx.answer.create({
        data: {
          participantId: job.participantId,
          questionId: job.question.id,
          selectedOption: 2,
          isCorrect: false,
        },
      });
    });
  });
  console.log(`\n4) Duplicitní odpovědi (očekáváme ${duplicateResult.durations.length + duplicateResult.errors} chyb — unique constraint)`);
  console.log(`   skutečně odmítnuto: ${duplicateResult.errors} / ${duplicateResult.durations.length + duplicateResult.errors}`);

  // --- Test 5: dashboard agregace pod zátěží (groupBy dotazy z lib/results.ts) ---
  const dashboardResult = await runBatch(Array.from({ length: 50 }), Math.min(CONCURRENCY, 20), async () => {
    await Promise.all([
      prisma.answer.groupBy({ by: ["participantId", "isCorrect"], _count: { _all: true } }),
      prisma.answer.groupBy({ by: ["questionId", "selectedOption", "isCorrect"], _count: { _all: true } }),
    ]);
  });
  summarize("5) Dashboard agregace (souběžné načtení /r/[token])", dashboardResult);

  console.log("\n✓ Hotovo. Výsledky zkopíruj do docs/LOAD-TEST.md.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
