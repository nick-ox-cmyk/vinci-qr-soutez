import Image from "next/image";
import { Card } from "@/components/Card";
import { RegistrationFlow } from "@/components/RegistrationFlow";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-6">
        <Image
          src="/vinci-energies-logo.svg"
          alt="VINCI Energies"
          width={162}
          height={43}
          priority
          className="mx-auto h-auto w-36"
        />
        <h1 className="mt-6 text-center font-serif text-3xl font-bold text-vinci-blue">VINCI Environment Day</h1>
        <div className="mt-5">
          <RegistrationFlow mode="home" />
        </div>
      </Card>
    </main>
  );
}
