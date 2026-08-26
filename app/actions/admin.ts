"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { isValidAdminUrlToken, isValidAdminPassword, setAdminCookie, ADMIN_COOKIE } from "@/lib/session";
import { adminLoginRateLimiter, getClientIp } from "@/lib/ratelimit";

/**
 * §7.1 — token se ověřuje samostatně (nesouhlasí → 404, řeší stránka),
 * tady se řeší jen heslo. Rate limit 5 pokusů / 10 minut / IP.
 */
export async function adminLogin(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!isValidAdminUrlToken(token)) {
    redirect("/");
  }

  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  const { success } = adminLoginRateLimiter.check(ip);
  if (!success) {
    redirect(`/r/${token}/login?error=rate_limited`);
  }

  if (!isValidAdminPassword(password)) {
    redirect(`/r/${token}/login?error=invalid`);
  }

  await setAdminCookie();
  redirect(`/r/${token}`);
}

export async function adminLogout(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect(isValidAdminUrlToken(token) ? `/r/${token}/login` : "/");
}
