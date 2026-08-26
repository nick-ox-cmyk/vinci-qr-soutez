import "dotenv/config";
import readline from "readline";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

/**
 * §8 GDPR — smaže osobní data účastníků (Answer, Participant) po akci.
 * `Employee`/`Company` zůstávají (jsou to jen HR data z CSV, ne osobní
 * soutěžní záznamy) — díky tomu jde příští rok znovu `npm run seed` beze ztráty.
 */
async function main() {
  const skipConfirm = process.argv.includes("--yes");

  const [answerCount, participantCount] = await Promise.all([
    prisma.answer.count(),
    prisma.participant.count(),
  ]);

  console.log(`Ke smazání: ${answerCount} odpovědí, ${participantCount} účastníků.`);
  console.log(`Zaměstnanci a firmy zůstanou zachováni.`);

  if (!skipConfirm) {
    const confirmed = await confirm("Opravdu smazat? Tuto akci nelze vzít zpět. (y/N) ");
    if (!confirmed) {
      console.log("Zrušeno.");
      process.exit(0);
    }
  }

  // Answer má onDelete: Cascade na Participant, takže smazání Participant
  // stačí — přesto mažeme explicitně oboje pro jasnost pořadí a přesné počty.
  const deletedAnswers = await prisma.answer.deleteMany({});
  const deletedParticipants = await prisma.participant.deleteMany({});

  console.log(`\n✓ Smazáno ${deletedAnswers.count} odpovědí a ${deletedParticipants.count} účastníků.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
