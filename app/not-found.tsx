import Link from "next/link";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

/**
 * Obecná 404 (§4) — používá se jak pro neexistující/neaktivní otázku, tak
 * pro nesouhlasící `/r/{token}`. Záměrně nerozlišuje důvod.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-6 text-center">
        <h1 className="text-xl font-bold text-vinci-blue">Stránka nenalezena</h1>
        <p className="mt-2 text-vinci-blue-ink">Tenhle odkaz neexistuje nebo už není aktivní.</p>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="secondary">Zpět na úvod</Button>
        </Link>
      </Card>
    </main>
  );
}
