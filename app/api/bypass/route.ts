import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidBypassToken } from "@/lib/session";
import { BYPASS_COOKIE, BYPASS_MAX_AGE_SEC } from "@/lib/bypass";

/**
 * `/api/bypass?token=...` — viz lib/bypass.ts. Vždy přesměruje na čisté "/",
 * ať token sedí nebo ne (neprozrazuje, jestli byl pokus úspěšný).
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";

  const redirectUrl = req.nextUrl.clone();
  redirectUrl.pathname = "/";
  redirectUrl.search = "";

  if (!isValidBypassToken(token)) {
    return NextResponse.redirect(redirectUrl);
  }

  const store = await cookies();
  store.set(BYPASS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: BYPASS_MAX_AGE_SEC,
  });

  return NextResponse.redirect(redirectUrl);
}
