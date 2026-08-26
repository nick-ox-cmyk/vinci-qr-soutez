import "server-only";
import { timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const PARTICIPANT_COOKIE = "ved_pid";
export const ADMIN_COOKIE = "ved_admin";

const PARTICIPANT_MAX_AGE_SEC = 60 * 60 * 24 * 60; // 60 dní (§5.2)
const ADMIN_MAX_AGE_SEC = 60 * 60 * 8; // 8 hodin (§7.1)

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET chybí nebo je kratší než 32 znaků. Spusť `npm run gen:secrets`."
    );
  }
  return new TextEncoder().encode(secret);
}

// ---------- Účastnická session (ved_pid) ----------

export async function createParticipantToken(participantId: string): Promise<string> {
  return new SignJWT({ pid: participantId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PARTICIPANT_MAX_AGE_SEC}s`)
    .sign(getSecretKey());
}

export async function verifyParticipantToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return typeof payload.pid === "string" ? payload.pid : null;
  } catch {
    return null;
  }
}

/** Nastaví podepsanou cookie po registraci / převzetí identity. */
export async function setParticipantCookie(participantId: string): Promise<void> {
  const token = await createParticipantToken(participantId);
  const store = await cookies();
  store.set(PARTICIPANT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PARTICIPANT_MAX_AGE_SEC,
  });
}

/** Vrátí participantId z platné cookie, nebo null (žádná / neplatná / prošlá session). */
export async function getParticipantId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(PARTICIPANT_COOKIE)?.value;
  if (!token) return null;
  return verifyParticipantToken(token);
}

// ---------- Admin session (ved_admin) ----------

export async function createAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_MAX_AGE_SEC}s`)
    .sign(getSecretKey());
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function setAdminCookie(): Promise<void> {
  const token = await createAdminToken();
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_MAX_AGE_SEC,
  });
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

// ---------- Timing-safe porovnání pro /r/{token} + heslo (§7.1) ----------

/** Konstantní čas i při rozdílné délce vstupu — nikdy neprozradí délku tajemství. */
function constantTimeEquals(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(a, a); // zachovej podobnou dobu běhu, výsledek zahoď
    return false;
  }
  return timingSafeEqual(a, b);
}

export function isValidAdminUrlToken(token: string): boolean {
  const expected = process.env.ADMIN_URL_TOKEN;
  if (!expected) return false;
  return constantTimeEquals(token, expected);
}

export function isValidAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return constantTimeEquals(password, expected);
}
