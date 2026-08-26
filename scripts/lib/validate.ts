import type { Language } from "@prisma/client";
import type { ParsedSource, RawEmployeeRow, RawQuestionRow } from "./parse";
import { normalizeSearchName } from "../../lib/employees";

const VALID_LANGUAGES = ["cs", "hu", "pl"];

export interface ValidEmployee {
  fullName: string;
  language: Language;
  company: string;
  externalRef: string | null;
}

export interface ValidQuestionTranslation {
  text: string;
  option1: string;
  option2: string;
  option3: string;
}

export interface ValidQuestion {
  number: number;
  correctOption: 1 | 2 | 3;
  translations: Record<Language, ValidQuestionTranslation>;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  employees: ValidEmployee[];
  questions: ValidQuestion[];
  sourceLabel: string;
}

function validateEmployeeRow(row: RawEmployeeRow, errors: string[]): ValidEmployee | null {
  let valid = true;

  if (!row.fullName.trim()) {
    errors.push(`${row.ref}: chybí jméno zaměstnance.`);
    valid = false;
  }
  if (!row.company.trim()) {
    errors.push(`${row.ref}: chybí firma.`);
    valid = false;
  }
  if (!VALID_LANGUAGES.includes(row.language)) {
    errors.push(`${row.ref}: neplatný jazyk "${row.language}" (očekáváno cs/hu/pl).`);
    valid = false;
  }

  if (!valid) return null;

  return {
    fullName: row.fullName.trim(),
    language: row.language as Language,
    company: row.company.trim().replace(/\s+/g, " "),
    externalRef: row.externalRef.trim() || null,
  };
}

function validateQuestionRow(row: RawQuestionRow, errors: string[]): ValidQuestion | null {
  let valid = true;

  const number = Number(row.number);
  if (!Number.isInteger(number) || number <= 0) {
    errors.push(`${row.ref}: neplatné číslo otázky "${row.number}".`);
    valid = false;
  }

  const correctOptionNum = Number(row.correctOption);
  if (![1, 2, 3].includes(correctOptionNum)) {
    errors.push(`${row.ref}: SPRÁVNÁ ODPOVĚĎ musí být 1, 2 nebo 3 (je "${row.correctOption}").`);
    valid = false;
  }

  const requiredFields: [string, string][] = [
    ["text (CS)", row.textCs],
    ["odpověď 1 (CS)", row.opt1Cs],
    ["odpověď 2 (CS)", row.opt2Cs],
    ["odpověď 3 (CS)", row.opt3Cs],
    ["text (HU)", row.textHu],
    ["odpověď 1 (HU)", row.opt1Hu],
    ["odpověď 2 (HU)", row.opt2Hu],
    ["odpověď 3 (HU)", row.opt3Hu],
    ["text (PL)", row.textPl],
    ["odpověď 1 (PL)", row.opt1Pl],
    ["odpověď 2 (PL)", row.opt2Pl],
    ["odpověď 3 (PL)", row.opt3Pl],
  ];
  for (const [label, value] of requiredFields) {
    if (!value.trim()) {
      errors.push(`${row.ref}: chybí ${label} — otázka musí mít kompletní překlad ve všech třech jazycích.`);
      valid = false;
    }
  }

  if (!valid) return null;

  return {
    number,
    correctOption: correctOptionNum as 1 | 2 | 3,
    translations: {
      cs: { text: row.textCs.trim(), option1: row.opt1Cs.trim(), option2: row.opt2Cs.trim(), option3: row.opt3Cs.trim() },
      hu: { text: row.textHu.trim(), option1: row.opt1Hu.trim(), option2: row.opt2Hu.trim(), option3: row.opt3Hu.trim() },
      pl: { text: row.textPl.trim(), option1: row.opt1Pl.trim(), option2: row.opt2Pl.trim(), option3: row.opt3Pl.trim() },
    },
  };
}

export function validateSource(source: ParsedSource): ValidationResult {
  const errors: string[] = [];

  const employees: ValidEmployee[] = [];
  for (const row of source.employees) {
    const employee = validateEmployeeRow(row, errors);
    if (employee) employees.push(employee);
  }

  // Duplicity jmen v rámci firmy (odpovídá @@unique([fullName, companyId])).
  const employeeKeys = new Map<string, string>();
  for (const row of source.employees) {
    if (!row.fullName.trim() || !row.company.trim()) continue;
    const key = `${normalizeSearchName(row.fullName)}::${row.company.trim().toLowerCase()}`;
    const firstRef = employeeKeys.get(key);
    if (firstRef) {
      errors.push(`${row.ref}: duplicitní zaměstnanec "${row.fullName}" ve firmě "${row.company}" (už na ${firstRef}).`);
    } else {
      employeeKeys.set(key, row.ref);
    }
  }

  const questions: ValidQuestion[] = [];
  for (const row of source.questions) {
    const question = validateQuestionRow(row, errors);
    if (question) questions.push(question);
  }

  // Unikátnost čísla otázky.
  const numberRefs = new Map<number, string>();
  for (const row of source.questions) {
    const number = Number(row.number);
    if (!Number.isInteger(number)) continue;
    const firstRef = numberRefs.get(number);
    if (firstRef) {
      errors.push(`${row.ref}: duplicitní číslo otázky ${number} (už na ${firstRef}).`);
    } else {
      numberRefs.set(number, row.ref);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    employees,
    questions,
    sourceLabel: source.sourceLabel,
  };
}
