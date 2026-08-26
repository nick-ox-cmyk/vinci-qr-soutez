import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeSearchName } from "@/lib/employees";
import { toEmployeeSearchResultDTO } from "@/lib/dto";
import { searchRateLimiter, getClientIp } from "@/lib/ratelimit";

const querySchema = z.object({ q: z.string().optional() });

/**
 * Jediný REST endpoint aplikace (§2.1) — potřebuje inkrementální dotazy pro
 * našeptávač. Vrací výhradně { id, fullName, companyName }. Nikdy jazyk,
 * nikdy externalRef (§5.1).
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const { success } = searchRateLimiter.check(ip);
  if (!success) {
    return NextResponse.json([], { status: 429 });
  }

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  const query = parsed.success ? (parsed.data.q ?? "").trim() : "";

  // Bez query nebo pod 2 znaky vrací prázdné pole — nikdy nevypisuj celý
  // seznam zaměstnanců.
  if (query.length < 2) {
    return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });
  }

  const normalized = normalizeSearchName(query);

  const employees = await prisma.employee.findMany({
    where: { searchName: { contains: normalized } },
    include: { company: true },
    orderBy: { fullName: "asc" },
    take: 8,
  });

  const results = employees.map((e) =>
    toEmployeeSearchResultDTO({ id: e.id, fullName: e.fullName, companyName: e.company.name })
  );

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
}
