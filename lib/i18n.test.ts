import { describe, expect, it } from "vitest";
import cs from "@/messages/cs.json";
import sk from "@/messages/sk.json";
import pl from "@/messages/pl.json";
import hu from "@/messages/hu.json";
import ro from "@/messages/ro.json";
import bg from "@/messages/bg.json";
import en from "@/messages/en.json";
import { t, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from "./i18n";

const ALL_DICTS: Record<string, unknown> = { cs, sk, pl, hu, ro, bg, en };

function collectKeyPaths(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    collectKeyPaths(value, prefix ? `${prefix}.${key}` : key)
  );
}

describe("message dictionaries", () => {
  it("all 7 CEE languages are wired up, with en as default", () => {
    expect(SUPPORTED_LANGUAGES.sort()).toEqual(["bg", "cs", "en", "hu", "pl", "ro", "sk"]);
    expect(DEFAULT_LANGUAGE).toBe("en");
  });

  it("all languages expose an identical set of keys (§10, §13)", () => {
    const referenceKeys = collectKeyPaths(en).sort();
    for (const [lang, dict] of Object.entries(ALL_DICTS)) {
      expect(collectKeyPaths(dict).sort(), `language "${lang}"`).toEqual(referenceKeys);
    }
  });

  it("no value is an empty string, in any language", () => {
    for (const [lang, dict] of Object.entries(ALL_DICTS)) {
      for (const path of collectKeyPaths(dict)) {
        const value = path.split(".").reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], dict);
        expect(typeof value === "string" && value.trim().length > 0, `${lang}.${path}`).toBe(true);
      }
    }
  });

  it("every language's languages.* table names all 7 languages", () => {
    for (const [lang, dict] of Object.entries(ALL_DICTS)) {
      const names = (dict as { languages: Record<string, string> }).languages;
      expect(Object.keys(names).sort(), `language "${lang}"`).toEqual(SUPPORTED_LANGUAGES.slice().sort());
    }
  });
});

describe("t()", () => {
  it("substitutes placeholders", () => {
    expect(t(cs, "question.questionLabel", { number: 7 })).toBe("Otázka 7");
    expect(t(cs, "question.progressLabel", { answered: 3, total: 30 })).toBe("3 / 30");
  });

  it("substitutes a named entity like an email address", () => {
    expect(t(en, "register.notFoundHelp", { email: "thavlickova@vinci-energies.cz" })).toContain(
      "thavlickova@vinci-energies.cz"
    );
  });

  it("falls back to the key itself and warns on a missing key", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(t(cs, "nope.missing" as any)).toBe("nope.missing");
  });
});
