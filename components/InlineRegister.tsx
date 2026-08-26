"use client";

import { useRouter } from "next/navigation";
import { RegistrationFlow } from "@/components/RegistrationFlow";

/**
 * Ztráta session na `/q/{slug}` (§5.3) — NEpřesměrovává, řeší se inline.
 * Po úspěšné registraci/převzetí identity jen znovu vyžádá server komponentu
 * (`router.refresh()`), která teď uvidí nastavenou cookie a vrátí otázku
 * rovnou ve správném jazyce, na místě.
 */
export function InlineRegister() {
  const router = useRouter();
  return <RegistrationFlow mode="inline" onRegistered={() => router.refresh()} />;
}
