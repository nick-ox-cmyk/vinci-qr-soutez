import Image from "next/image";
import { Card } from "@/components/Card";
import { RegistrationFlow } from "@/components/RegistrationFlow";
import { CompetitionLockedScreen } from "@/components/CompetitionLockedScreen";
import { getCompetitionPhase, getCompetitionStart, getCompetitionEnd } from "@/lib/competition-window";

// Bez tohohle by Next.js stránku (žádná cookies()/headers() závislost)
// staticky prerenderoval při buildu a fáze soutěže by zůstala navždy
// zamrzlá na stavu z okamžiku buildu — časový zámek MUSÍ se vyhodnocovat
// při každém požadavku.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const phase = getCompetitionPhase();

  if (phase === "before") {
    return <CompetitionLockedScreen phase="before" date={getCompetitionStart()} />;
  }
  if (phase === "after") {
    return <CompetitionLockedScreen phase="after" date={getCompetitionEnd()} />;
  }

  return (
    // Zarovnáno nahoru (ne na střed) jako stránka otázky — vycentrovaný obsah
    // by při přepnutí jazyka (jiná délka textu -> jiná výška karty) vizuálně
    // poskakoval nahoru/dolů.
    <main className="flex flex-1 flex-col items-center px-4 py-10">
      <Card className="w-full max-w-md p-6">
        <Image
          src="/vinci-energies-logo.svg"
          alt="VINCI Energies"
          width={162}
          height={43}
          priority
          className="mx-auto h-auto w-36"
        />
        <div className="mt-5">
          <RegistrationFlow mode="home" />
        </div>
      </Card>
    </main>
  );
}
