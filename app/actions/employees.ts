"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ConfirmationDTO } from "@/lib/dto";

const schema = z.object({ employeeId: z.string().min(1) });

/**
 * Načte data pro potvrzovací obrazovku (§5.1 krok 4) POTÉ, co uživatel
 * vybere konkrétní jméno z našeptávače. Až tady je bezpečné vrátit jazyk —
 * `/api/employees/search` ho záměrně nikdy nevrací, protože by u shodných
 * jmen prozrazoval navíc informaci ještě před tím, než je uživatel jistý,
 * že jde o něj.
 */
export async function getEmployeeConfirmation(employeeId: string): Promise<ConfirmationDTO | null> {
  const parsed = schema.safeParse({ employeeId });
  if (!parsed.success) return null;

  const employee = await prisma.employee.findUnique({
    where: { id: parsed.data.employeeId },
    include: { company: true },
  });
  if (!employee) return null;

  return {
    employeeId: employee.id,
    fullName: employee.fullName,
    companyName: employee.company.name,
    language: employee.language,
  };
}
