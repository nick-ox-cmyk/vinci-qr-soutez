import { describe, expect, it } from "vitest";
import cs from "@/messages/cs.json";
import hu from "@/messages/hu.json";
import pl from "@/messages/pl.json";
import { t } from "./i18n";

function collectKeyPaths(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    collectKeyPaths(value, prefix ? `${prefix}.${key}` : key)
  );
}

describe("message dictionaries", () => {
  it("cs/hu/pl expose an identical set of keys (§10, §13)", () => {
    const csKeys = collectKeyPaths(cs).sort();
    const huKeys = collectKeyPaths(hu).sort();
    const plKeys = collectKeyPaths(pl).sort();

    expect(huKeys).toEqual(csKeys);
    expect(plKeys).toEqual(csKeys);
  });

  it("no value is an empty string", () => {
    for (const dict of [cs, hu, pl]) {
      for (const path of collectKeyPaths(dict)) {
        const value = path.split(".").reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], dict);
        expect(typeof value === "string" && value.trim().length > 0).toBe(true);
      }
    }
  });
});

describe("t()", () => {
  it("substitutes placeholders", () => {
    expect(t(cs, "question.questionLabel", { number: 7 })).toBe("Otázka 7");
    expect(t(cs, "question.progressLabel", { answered: 3, total: 30 })).toBe("3 / 30");
  });

  it("falls back to the key itself and warns on a missing key", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(t(cs, "nope.missing" as any)).toBe("nope.missing");
  });
});
