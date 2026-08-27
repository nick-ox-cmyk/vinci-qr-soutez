import type { Language } from "@prisma/client";
import type { ParsedSource, RawEmployeeRow, RawQuestionRow } from "./parse";
import { LANGUAGE_ORDER } from "./parse";
import { normalizeSearchName } from "../../lib/employees";

const VALID_LANGUAGES: readonly string[] = LANGUAGE_ORDER;

const LANGUAGE_LABEL: Record<string, string> = {
  cs: "CS",
  sk: "SK",
  pl: "PL",
  hu: "HU",
  ro: "RO",
  bg: "BG",
  en: "EN",
};

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
    errors.push(`${row.ref}: neplatný jazyk "${row.language}" (očekáváno jedno z: ${VALID_LANGUAGES.join("/")}).`);
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

  for (const lang of LANGUAGE_ORDER) {
    const tr = row.translations[lang];
    const label = LANGUAGE_LABEL[lang];
    const fields: [string, string][] = [
      [`text (${label})`, tr.text],
      [`odpověď 1 (${label})`, tr.option1],
      [`odpověď 2 (${label})`, tr.option2],
      [`odpověď 3 (${label})`, tr.option3],
    ];
    for (const [fieldLabel, value] of fields) {
      if (!value.trim()) {
        errors.push(`${row.ref}: chybí ${fieldLabel} — otázka musí mít kompletní překlad ve všech ${LANGUAGE_ORDER.length} jazycích.`);
        valid = false;
      }
    }
  }

  if (!valid) return null;

  const translations = {} as Record<Language, ValidQuestionTranslation>;
  for (const lang of LANGUAGE_ORDER) {
    const tr = row.translations[lang];
    translations[lang] = {
      text: tr.text.trim(),
      option1: tr.option1.trim(),
      option2: tr.option2.trim(),
      option3: tr.option3.trim(),
    };
  }

  return {
    number,
    correctOption: correctOptionNum as 1 | 2 | 3,
    translations,
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
