import Image from "next/image";
import { Card } from "@/components/Card";
import { RegistrationFlow } from "@/components/RegistrationFlow";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      {/*
        Fotografický pás — příroda / větrné elektrárny (§9.3). Placeholder
        gradientem, dokud nedorazí oficiální fotka `public/hero.jpg`
        z materiálů VINCI (viz README, §15 bod 5).
      */}
      <div
        className="relative h-44 shrink-0 sm:h-56"
        style={{ background: "linear-gradient(135deg, var(--vinci-blue) 0%, var(--eco-teal) 100%)" }}
      >
        <Image
          src="/wenow-badge.svg"
          alt="WeNow — The environment needs all of us"
          width={96}
          height={96}
          priority
          className="absolute -bottom-8 right-6 drop-shadow-lg sm:h-28 sm:w-28"
        />
      </div>

      <div className="flex-1 px-4 pb-10">
        <Card roundedCorner className="mx-auto -mt-10 max-w-md p-6 pt-8">
          <h1 className="font-serif text-3xl font-bold text-vinci-blue">VINCI Environment Day</h1>
          <div className="mt-5">
            <RegistrationFlow mode="home" />
          </div>
        </Card>
      </div>
    </main>
  );
}
