import { describe, expect, it } from "vitest";
import { normalizeSearchName } from "./employees";

describe("normalizeSearchName", () => {
  it("strips diacritics and lowercases", () => {
    expect(normalizeSearchName("Nováková")).toBe("novakova");
    expect(normalizeSearchName("Dvořák")).toBe("dvorak");
    expect(normalizeSearchName("Eszter Nagyné Tóth")).toBe("eszter nagyne toth");
  });

  it("handles Polish Ł/ł, which Unicode NFD does not decompose as base+diacritic", () => {
    expect(normalizeSearchName("Łukasz Kamiński")).toBe("lukasz kaminski");
  });

  it("lets a diacritic-free query match a diacritic-bearing name (§5.1)", () => {
    const stored = normalizeSearchName("Nováková");
    const query = normalizeSearchName("novak");
    expect(stored).toContain(query);
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeSearchName("  Jan Novák  ")).toBe("jan novak");
  });
});
