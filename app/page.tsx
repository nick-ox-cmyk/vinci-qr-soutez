import { Card } from "@/components/Card";
import { RegistrationFlow } from "@/components/RegistrationFlow";
import { CompetitionLockedScreen } from "@/components/CompetitionLockedScreen";
import { getCompetitionPhase, getCompetitionStart, getCompetitionEnd } from "@/lib/competition-window";
import { isBypassActive } from "@/lib/bypass";

// Bez tohohle by Next.js stránku (žádná cookies()/headers() závislost)
// staticky prerenderoval při buildu a fáze soutěže by zůstala navždy
// zamrzlá na stavu z okamžiku buildu — časový zámek MUSÍ se vyhodnocovat
// při každém požadavku.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const phase = getCompetitionPhase();
  const locked = phase !== "open" && !(await isBypassActive());

  if (locked) {
    if (phase === "before") return <CompetitionLockedScreen phase="before" date={getCompetitionStart()} />;
    return <CompetitionLockedScreen phase="after" date={getCompetitionEnd()} />;
  }

  return (
    // Zarovnáno nahoru (ne na střed) jako stránka otázky — vycentrovaný obsah
    // by při přepnutí jazyka (jiná délka textu -> jiná výška karty) vizuálně
    // poskakoval nahoru/dolů.
    <main className="flex flex-1 flex-col items-center px-4 py-10">
      <Card className="w-full max-w-md p-6">
        <RegistrationFlow mode="home" />
      </Card>
    </main>
  );
}
