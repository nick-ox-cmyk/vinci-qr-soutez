import { describe, expect, it } from "vitest";
import { validateSource } from "./validate";
import type { ParsedSource } from "./parse";

function baseQuestionRow(overrides: Partial<ParsedSource["questions"][number]> = {}) {
  return {
    number: "1",
    correctOption: "2",
    textCs: "Otázka?",
    opt1Cs: "A",
    opt2Cs: "B",
    opt3Cs: "C",
    textHu: "Kérdés?",
    opt1Hu: "A",
    opt2Hu: "B",
    opt3Hu: "C",
    textPl: "Pytanie?",
    opt1Pl: "A",
    opt2Pl: "B",
    opt3Pl: "C",
    ref: "test.csv:2",
    ...overrides,
  };
}

function baseEmployeeRow(overrides: Partial<ParsedSource["employees"][number]> = {}) {
  return {
    fullName: "Jan Novák",
    language: "cs",
    company: "VINCI Energies CZ",
    externalRef: "",
    ref: "test.csv:2",
    ...overrides,
  };
}

describe("validateSource", () => {
  it("accepts fully valid data", () => {
    const result = validateSource({
      employees: [baseEmployeeRow()],
      questions: [baseQuestionRow()],
      sourceLabel: "test",
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.employees).toHaveLength(1);
    expect(result.questions).toHaveLength(1);
  });

  it("rejects an invalid correct_option", () => {
    const result = validateSource({
      employees: [],
      questions: [baseQuestionRow({ correctOption: "4" })],
      sourceLabel: "test",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("SPRÁVNÁ ODPOVĚĎ"))).toBe(true);
  });

  it("rejects a question missing a translation", () => {
    const result = validateSource({
      employees: [],
      questions: [baseQuestionRow({ textHu: "" })],
      sourceLabel: "test",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("text (HU)"))).toBe(true);
  });

  it("rejects duplicate question numbers", () => {
    const result = validateSource({
      employees: [],
      questions: [
        baseQuestionRow({ number: "1", ref: "test.csv:2" }),
        baseQuestionRow({ number: "1", ref: "test.csv:3" }),
      ],
      sourceLabel: "test",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("duplicitní číslo otázky"))).toBe(true);
  });

  it("rejects an invalid employee language", () => {
    const result = validateSource({
      employees: [baseEmployeeRow({ language: "de" })],
      questions: [],
      sourceLabel: "test",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("neplatný jazyk"))).toBe(true);
  });

  it("rejects duplicate employee name within the same company, regardless of diacritics", () => {
    const result = validateSource({
      employees: [
        baseEmployeeRow({ fullName: "Jan Novák", company: "VINCI Energies CZ", ref: "test.csv:2" }),
        baseEmployeeRow({ fullName: "jan novak", company: "vinci energies cz", ref: "test.csv:3" }),
      ],
      questions: [],
      sourceLabel: "test",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("duplicitní zaměstnanec"))).toBe(true);
  });

  it("allows the same name across two different companies (disambiguated by company)", () => {
    const result = validateSource({
      employees: [
        baseEmployeeRow({ fullName: "Jan Novák", company: "TPI Česká republika, s.r.o.", ref: "test.csv:2" }),
        baseEmployeeRow({ fullName: "Jan Novák", company: "Actemium CZ, s.r.o.", ref: "test.csv:3" }),
      ],
      questions: [],
      sourceLabel: "test",
    });
    expect(result.ok).toBe(true);
  });
});
