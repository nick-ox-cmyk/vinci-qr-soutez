import { describe, expect, it } from "vitest";
import { generateSlug, isValidSlugFormat, SLUG_ALPHABET, SLUG_LENGTH } from "./slug";
import { ensureSlugs } from "../scripts/lib/slugs";

describe("generateSlug", () => {
  it("uses only the allowed alphabet and the expected length", () => {
    for (let i = 0; i < 200; i++) {
      const slug = generateSlug();
      expect(slug).toHaveLength(SLUG_LENGTH);
      expect([...slug].every((ch) => SLUG_ALPHABET.includes(ch))).toBe(true);
    }
  });

  it("never contains 0, o, 1, l, i (ambiguous when handwritten)", () => {
    const forbidden = ["0", "o", "1", "l", "i"];
    for (let i = 0; i < 200; i++) {
      const slug = generateSlug();
      for (const ch of forbidden) expect(slug).not.toContain(ch);
    }
  });

  it("is unique across 10 000 samples", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      seen.add(generateSlug());
    }
    expect(seen.size).toBe(10_000);
  });

  it("has no deterministic relationship to a question number", () => {
    // ensureSlugs přiřazuje otázce číslo -> slug čistě náhodně, ne odvozením
    // z čísla. Dvě nezávislá volání pro tutéž otázku č. 1 musí dát jiný slug.
    const a = ensureSlugs({}, [1])["1"];
    const b = ensureSlugs({}, [1])["1"];
    expect(a).not.toBe(b);
  });
});

describe("isValidSlugFormat", () => {
  it("accepts a well-formed slug", () => {
    expect(isValidSlugFormat(generateSlug())).toBe(true);
  });

  it("rejects wrong length and forbidden characters", () => {
    expect(isValidSlugFormat("short")).toBe(false);
    expect(isValidSlugFormat("123456789")).toBe(false); // obsahuje "1"
    expect(isValidSlugFormat("abcdefgho")).toBe(false); // obsahuje "o"
  });
});
