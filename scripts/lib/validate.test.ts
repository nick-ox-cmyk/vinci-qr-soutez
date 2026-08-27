import { describe, expect, it } from "vitest";
import { validateSource } from "./validate";
import { LANGUAGE_ORDER, type ParsedSource, type RawTranslation } from "./parse";

function baseQuestionRow(overrides: {
  number?: string;
  correctOption?: string;
  ref?: string;
  translations?: Partial<Record<string, Partial<RawTranslation>>>;
} = {}) {
  const translations = {} as Record<string, RawTranslation>;
  for (const lang of LANGUAGE_ORDER) {
    translations[lang] = {
      text: "Question?",
      option1: "A",
      option2: "B",
      option3: "C",
      ...overrides.translations?.[lang],
    };
  }
  return {
    number: "1",
    correctOption: "2",
    ref: "test.csv:2",
    ...overrides,
    translations,
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
    expect(Object.keys(result.questions[0].translations).sort()).toEqual([...LANGUAGE_ORDER].sort());
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

  it("rejects a question missing a translation in any of the 7 languages", () => {
    const result = validateSource({
      employees: [],
      questions: [baseQuestionRow({ translations: { hu: { text: "" } } })],
      sourceLabel: "test",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("text (HU)"))).toBe(true);
  });

  it("rejects a question missing a newly-added language (RO/BG/SK/EN), not just the original 3", () => {
    for (const lang of ["sk", "ro", "bg", "en"]) {
      const result = validateSource({
        employees: [],
        questions: [baseQuestionRow({ translations: { [lang]: { text: "" } } })],
        sourceLabel: "test",
      });
      expect(result.ok, `language "${lang}"`).toBe(false);
    }
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

  it("accepts all 7 CEE employee languages", () => {
    for (const lang of LANGUAGE_ORDER) {
      const result = validateSource({
        employees: [baseEmployeeRow({ language: lang, fullName: `Test ${lang}` })],
        questions: [],
        sourceLabel: "test",
      });
      expect(result.ok, `language "${lang}"`).toBe(true);
    }
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
