import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { parseDelimited } from "./csv";

export interface RawEmployeeRow {
  fullName: string;
  language: string;
  company: string;
  externalRef: string;
  ref: string;
}

export interface RawQuestionRow {
  number: string;
  correctOption: string;
  textCs: string;
  opt1Cs: string;
  opt2Cs: string;
  opt3Cs: string;
  textHu: string;
  opt1Hu: string;
  opt2Hu: string;
  opt3Hu: string;
  textPl: string;
  opt1Pl: string;
  opt2Pl: string;
  opt3Pl: string;
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

function parseQuestionsXlsxSheet(sheet: XLSX.WorkSheet, fileName: string): RawQuestionRow[] {
  // blankrows: true (výchozí) — jinak by SheetJS vynechané prázdné řádky
  // posunuly číslování a chybové hlášky by ukazovaly špatný řádek v Excelu.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  // Řádek 1 = skupinový pruh, řádek 2 = hlavička, data od řádku 3 (§11.4).
  const questions: RawQuestionRow[] = [];
  for (let i = 2; i < rows.length; i++) {
    const r = (rows[i] as unknown[]).map((c) => String(c ?? "").trim());
    const excelRow = i + 1;
    const textCs = r[2] ?? "";
    // Sešit má předvyplněnou kostru 1–30 — prázdný text otázky přeskoč.
    if (!textCs.trim()) continue;
    questions.push({
      number: r[0] ?? "",
      correctOption: r[1] ?? "",
      textCs,
      opt1Cs: r[3] ?? "",
      opt2Cs: r[4] ?? "",
      opt3Cs: r[5] ?? "",
      textHu: r[6] ?? "",
      opt1Hu: r[7] ?? "",
      opt2Hu: r[8] ?? "",
      opt3Hu: r[9] ?? "",
      textPl: r[10] ?? "",
      opt1Pl: r[11] ?? "",
      opt2Pl: r[12] ?? "",
      opt3Pl: r[13] ?? "",
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
    const textCs = (r[2] ?? "").trim();
    if (!textCs) continue; // stejné pravidlo jako u XLSX — kostra se smí plnit postupně
    questions.push({
      number: (r[0] ?? "").trim(),
      correctOption: (r[1] ?? "").trim(),
      textCs,
      opt1Cs: (r[3] ?? "").trim(),
      opt2Cs: (r[4] ?? "").trim(),
      opt3Cs: (r[5] ?? "").trim(),
      textHu: (r[6] ?? "").trim(),
      opt1Hu: (r[7] ?? "").trim(),
      opt2Hu: (r[8] ?? "").trim(),
      opt3Hu: (r[9] ?? "").trim(),
      textPl: (r[10] ?? "").trim(),
      opt1Pl: (r[11] ?? "").trim(),
      opt2Pl: (r[12] ?? "").trim(),
      opt3Pl: (r[13] ?? "").trim(),
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
