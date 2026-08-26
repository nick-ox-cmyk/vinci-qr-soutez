-- AlterTable
ALTER TABLE "Answer" ALTER COLUMN "answeredAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "firstAnswerAt" TIMESTAMPTZ(3),
ADD COLUMN     "lastAnswerAt" TIMESTAMPTZ(3),
ALTER COLUMN "registeredAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "lastSeenAt" SET DATA TYPE TIMESTAMPTZ(3);

-- Backfill: dopočítej firstAnswerAt/lastAnswerAt pro účastníky, kteří už
-- mají odpovědi zapsané z doby před touto migrací (nové zápisy je od teď
-- nastavují transakčně přímo v submitAnswer, viz app/actions/answer.ts).
UPDATE "Participant" p
SET "firstAnswerAt" = sub.first_at,
    "lastAnswerAt" = sub.last_at
FROM (
  SELECT "participantId", MIN("answeredAt") AS first_at, MAX("answeredAt") AS last_at
  FROM "Answer"
  GROUP BY "participantId"
) sub
WHERE p.id = sub."participantId";
