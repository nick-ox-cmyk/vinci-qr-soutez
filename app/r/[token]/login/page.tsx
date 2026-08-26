import { notFound, redirect } from "next/navigation";
import { isValidAdminUrlToken, isAdmin } from "@/lib/session";
import { adminLogin } from "@/app/actions/admin";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

export default async function AdminLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  // Nesouhlasí → 404, ne 403 (§7.1), a porovnává se konstantním časem.
  if (!isValidAdminUrlToken(token)) notFound();
  if (await isAdmin()) redirect(`/r/${token}`);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-xl font-bold text-vinci-blue">Výsledky soutěže</h1>
        <p className="mt-1 text-sm text-text-muted">Zadej heslo pro přístup k výsledkům.</p>

        <form action={adminLogin} className="mt-6 space-y-4">
          <input type="hidden" name="token" value={token} />
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-vinci-blue-ink">
              Heslo
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="w-full rounded-xl border border-border px-4 py-3 text-base focus:border-vinci-blue focus:outline-none focus:ring-2 focus:ring-vinci-blue/20"
            />
          </div>

          {error === "invalid" && <p className="text-sm text-vinci-red">Nesprávné heslo.</p>}
          {error === "rate_limited" && (
            <p className="text-sm text-vinci-red">Příliš mnoho pokusů. Zkus to prosím za pár minut.</p>
          )}

          <Button type="submit" variant="secondary" className="w-full">
            Přihlásit
          </Button>
        </form>
      </Card>
    </main>
  );
}
