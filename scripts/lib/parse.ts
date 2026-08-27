import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { parseDelimited } from "./csv";

// Musí odpovídat lib/i18n.ts `SUPPORTED_LANGUAGES` — zdvojeno tady záměrně
// (viz komentář u importu v lib/i18n.ts), aby skripty spouštěné přes `tsx`
// nezávisely na tom, jestli @-alias resolvne i mimo Next.js runtime.
export const LANGUAGE_ORDER = ["cs", "sk", "pl", "hu", "ro", "bg", "en"] as const;
export type SeedLanguage = (typeof LANGUAGE_ORDER)[number];

export interface RawEmployeeRow {
  fullName: string;
  language: string;
  company: string;
  externalRef: string;
  ref: string;
}

export interface RawTranslation {
  text: string;
  option1: string;
  option2: string;
  option3: string;
}

export interface RawQuestionRow {
  number: string;
  correctOption: string;
  translations: Record<SeedLanguage, RawTranslation>;
  ref: string;
}

export interface ParsedSource {
  employees: RawEmployeeRow[];
  questions: RawQuestionRow[];
  sourceLabel: string;
}

function isBlankRow(cells: string[]): boolean {
  return cells.every((c) => c.trim() === "");
}

function findXlsxFile(dataDir: string): string | null {
  if (!fs.existsSync(dataDir)) return null;
  const file = fs.readdirSync(dataDir).find((f) => f.toLowerCase().endsWith(".xlsx"));
  return file ? path.join(dataDir, file) : null;
}

/**
 * Sestaví `translations` ze 4-sloupcových bloků (text, opt1, opt2, opt3) za
 * sebou v pořadí `LANGUAGE_ORDER`, počínaje sloupcem `startColumn` (0-indexed).
 * Používá se pro XLSX i CSV — obě mají stejné pořadí sloupců (§11.2, §11.4).
 */
function buildTranslations(row: string[], startColumn: number): Record<SeedLanguage, RawTranslation> {
  const translations = {} as Record<SeedLanguage, RawTranslation>;
  LANGUAGE_ORDER.forEach((lang, i) => {
    const base = startColumn + i * 4;
    translations[lang] = {
      text: (row[base] ?? "").trim(),
      option1: (row[base + 1] ?? "").trim(),
      option2: (row[base + 2] ?? "").trim(),
      option3: (row[base + 3] ?? "").trim(),
    };
  });
  return translations;
}

const QUESTION_TEXT_START_COLUMN = 2; // 0=number, 1=correct_option, 2.. = jazykové bloky

function parseQuestionsXlsxSheet(sheet: XLSX.WorkSheet, fileName: string): RawQuestionRow[] {
  // blankrows: true (výchozí) — jinak by SheetJS vynechané prázdné řádky
  // posunuly číslování a chybové hlášky by ukazovaly špatný řádek v Excelu.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  // Řádek 1 = skupinový pruh, řádek 2 = hlavička, data od řádku 3 (§11.4).
  const questions: RawQuestionRow[] = [];
  for (let i = 2; i < rows.length; i++) {
    const r = (rows[i] as unknown[]).map((c) => String(c ?? "").trim());
    const excelRow = i + 1;
    // Sešit má předvyplněnou kostru 1–30 — prázdný český text otázky (ta je
    // vždy první blok, "předloha") přeskoč.
    if (!r[QUESTION_TEXT_START_COLUMN]?.trim()) continue;
    questions.push({
      number: r[0] ?? "",
      correctOption: r[1] ?? "",
      translations: buildTranslations(r, QUESTION_TEXT_START_COLUMN),
      ref: `${fileName} list OTÁZKY, řádek ${excelRow}`,
    });
  }
  return questions;
}

function parseEmployeesXlsxSheet(sheet: XLSX.WorkSheet, fileName: string): RawEmployeeRow[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  // Hlavička v řádku 1, data od řádku 2 (§11.4).
  const employees: RawEmployeeRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = (rows[i] as unknown[]).map((c) => String(c ?? "").trim());
    const excelRow = i + 1;
    if (isBlankRow(r)) continue;
    employees.push({
      fullName: r[0] ?? "",
      language: (r[1] ?? "").toLowerCase(),
      company: r[2] ?? "",
      externalRef: r[3] ?? "",
      ref: `${fileName} list ZAMĚSTNANCI, řádek ${excelRow}`,
    });
  }
  return employees;
}

function parseQuestionsCsv(filePath: string): RawQuestionRow[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const rows = parseDelimited(raw, ";");
  const fileName = path.basename(filePath);
  const questions: RawQuestionRow[] = [];
  // rows[0] = hlavička, data od rows[1].
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const lineNumber = i + 1;
    if (!r[QUESTION_TEXT_START_COLUMN]?.trim()) continue; // stejné pravidlo jako u XLSX — kostra se smí plnit postupně
    questions.push({
      number: (r[0] ?? "").trim(),
      correctOption: (r[1] ?? "").trim(),
      translations: buildTranslations(r, QUESTION_TEXT_START_COLUMN),
      ref: `${fileName}:${lineNumber}`,
    });
  }
  return questions;
}

function parseEmployeesCsv(filePath: string): RawEmployeeRow[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const rows = parseDelimited(raw, ";");
  const fileName = path.basename(filePath);
  const employees: RawEmployeeRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const lineNumber = i + 1;
    if (isBlankRow(r)) continue;
    employees.push({
      fullName: (r[0] ?? "").trim(),
      language: (r[1] ?? "").trim().toLowerCase(),
      company: (r[2] ?? "").trim(),
      externalRef: (r[3] ?? "").trim(),
      ref: `${fileName}:${lineNumber}`,
    });
  }
  return employees;
}

/**
 * Načte zdrojová data pro seed/validaci (§11). Pokud v `dataDir` leží
 * libovolný `*.xlsx`, má přednost před CSV (§11.4). Jinak se čte
 * `employees.csv` + `questions.csv` (§11.1, §11.2).
 */
export function loadSource(dataDir: string): ParsedSource {
  const xlsxPath = findXlsxFile(dataDir);

  if (xlsxPath) {
    const fileName = path.basename(xlsxPath);
    const workbook = XLSX.readFile(xlsxPath);

    const questionsSheet = workbook.Sheets["OTÁZKY"];
    const employeesSheet = workbook.Sheets["ZAMĚSTNANCI"];
    if (!questionsSheet) throw new Error(`${fileName}: chybí list "OTÁZKY".`);
    if (!employeesSheet) throw new Error(`${fileName}: chybí list "ZAMĚSTNANCI".`);

    return {
      employees: parseEmployeesXlsxSheet(employeesSheet, fileName),
      questions: parseQuestionsXlsxSheet(questionsSheet, fileName),
      sourceLabel: `XLSX (${fileName})`,
    };
  }

  const employeesCsvPath = path.join(dataDir, "employees.csv");
  const questionsCsvPath = path.join(dataDir, "questions.csv");
  if (!fs.existsSync(employeesCsvPath)) throw new Error(`Chybí ${employeesCsvPath} (ani žádný *.xlsx v data/).`);
  if (!fs.existsSync(questionsCsvPath)) throw new Error(`Chybí ${questionsCsvPath} (ani žádný *.xlsx v data/).`);

  return {
    employees: parseEmployeesCsv(employeesCsvPath),
    questions: parseQuestionsCsv(questionsCsvPath),
    sourceLabel: "CSV (employees.csv + questions.csv)",
  };
}
