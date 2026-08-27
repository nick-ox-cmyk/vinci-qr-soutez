import "server-only";
import { cookies } from "next/headers";
import { isValidBypassToken } from "@/lib/session";

/**
 * Dočasné obejití časového zámku soutěže (§9), dokud appka běží na dočasné
 * `*.vercel.app` doméně a je potřeba ji reálně vyzkoušet mimo ostré okno.
 *
 * Aktivace: otevři `/api/bypass?token=<COMPETITION_BYPASS_TOKEN>` — nastaví
 * HttpOnly cookie a appka se pro ten prohlížeč chová, jako by okno bylo
 * otevřené (registrace i odpovídání). Bez správného tokenu se nic nenastaví.
 *
 * "Schování" na ostré doméně: stačí v env smazat `COMPETITION_BYPASS_TOKEN`.
 * `isValidBypassToken` bez něj vrací vždy false — i staré cookie od
 * testerů tím okamžitě přestanou platit, není potřeba měnit kód.
 */
export const BYPASS_COOKIE = "ved_bypass";
export const BYPASS_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 dní — jen na testovací období

export async function isBypassActive(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(BYPASS_COOKIE)?.value;
  if (!value) return false;
  return isValidBypassToken(value);
}
