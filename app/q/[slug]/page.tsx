import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getParticipantId } from "@/lib/session";
import { toQuestionDTO } from "@/lib/dto";
import { getDictionary, DEFAULT_LANGUAGE } from "@/lib/i18n";
import { isValidSlugFormat } from "@/lib/slug";
import { getClientIp, questionPageRateLimiter } from "@/lib/ratelimit";
import { getCompetitionPhase, getCompetitionStart, getCompetitionEnd } from "@/lib/competition-window";
import { InlineRegister } from "@/components/InlineRegister";
import { QuestionView } from "@/components/QuestionView";
import { CompetitionLockedScreen } from "@/components/CompetitionLockedScreen";
import { Card } from "@/components/Card";
import { SetHtmlLang } from "@/components/SetHtmlLang";
import type { Language } from "@prisma/client";

// Stránka už je dynamická díky headers()/cookies(), ale explicitně to
// deklarujeme — časový zámek soutěže se musí vyhodnocovat při každém
// požadavku, nesmí se nikdy zafixovat z buildu.
export const dynamic = "force-dynamic";

function InlineRegisterShell() {
  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <Card className="mx-auto w-full max-w-md p-6">
        <InlineRegister />
      </Card>
    </main>
  );
}

export default async function QuestionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Lehký rate limit na /q/* (§4, §8) — best-effort, nikdy nezablokuje jinak
  // platnou žádost tvrdou chybou, jen omezuje zátěž při zneužití.
  const hdrs = await headers();
  questionPageRateLimiter.check(getClientIp(hdrs));

  if (!isValidSlugFormat(slug)) notFound();

  const participantId = await getParticipantId();
  const participant = participantId ? await prisma.participant.findUnique({ where: { id: participantId } }) : null;

  // QR kódy visí den dopředu, ale odpovídat jde jen v daném časovém okně
  // ("VĚC NA VÍC"). Známe-li už jazyk účastníka, ukaž hlášku rovnou v něm.
  const phase = getCompetitionPhase();
  if (phase === "before") {
    return <CompetitionLockedScreen phase="before" date={getCompetitionStart()} knownLanguage={participant?.language} />;
  }
  if (phase === "after") {
    return <CompetitionLockedScreen phase="after" date={getCompetitionEnd()} knownLanguage={participant?.language} />;
  }

  if (!participant) return <InlineRegisterShell />;

  const question = await prisma.question.findUnique({
    where: { slug },
    include: { translations: true },
  });

  // Neexistující slug i neaktivní otázka → stejná obecná 404 (§4) — nikdy
  // nerozlišuj „neexistuje" vs. „neaktivní".
  if (!question || !question.active) notFound();

  let translation = question.translations.find((tr) => tr.language === participant.language);
  if (!translation) {
    const fallback: Language = DEFAULT_LANGUAGE;
    console.warn(
      `[question] Chybí překlad otázky č. ${question.number} pro jazyk "${participant.language}", používám fallback ${fallback}.`
    );
    translation = question.translations.find((tr) => tr.language === fallback);
  }
  if (!translation) notFound();

  const [existingAnswer, answeredCount, totalQuestions] = await Promise.all([
    prisma.answer.findUnique({
      where: { participantId_questionId: { participantId: participant.id, questionId: question.id } },
    }),
    prisma.answer.count({ where: { participantId: participant.id } }),
    prisma.question.count({ where: { active: true } }),
  ]);

  const dict = getDictionary(participant.language);
  const dto = toQuestionDTO({
    id: question.id,
    number: question.number,
    slug: question.slug,
    text: translation.text,
    option1: translation.option1,
    option2: translation.option2,
    option3: translation.option3,
  });

  return (
    <main className="flex flex-1 flex-col px-4 py-6">
      <SetHtmlLang lang={participant.language} />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <QuestionView
          question={dto}
          dict={dict}
          answeredCount={answeredCount}
          totalQuestions={totalQuestions}
          existingAnswer={existingAnswer ? { selectedOption: existingAnswer.selectedOption } : null}
        />
      </div>
    </main>
  );
}
