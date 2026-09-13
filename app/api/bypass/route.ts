import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidBypassToken } from "@/lib/session";
import { BYPASS_COOKIE, BYPASS_MAX_AGE_SEC } from "@/lib/bypass";

/**
 * `/api/bypass?token=...` — viz lib/bypass.ts. Vždy přesměruje na čisté "/",
 * ať token sedí nebo ne (neprozrazuje, jestli byl pokus úspěšný).
 *
 * Location je záměrně relativní: za reverse proxy (nginx na VPS) obsahuje
 * `req.nextUrl` interní adresu `next start` (https://localhost:4600), takže
 * absolutní redirect by poslal prohlížeč mimo doménu.
 */
function redirectHome() {
  return new NextResponse(null, { status: 307, headers: { Location: "/" } });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";

  if (!isValidBypassToken(token)) {
    return redirectHome();
  }

  const store = await cookies();
  store.set(BYPASS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: BYPASS_MAX_AGE_SEC,
  });

  return redirectHome();
}
