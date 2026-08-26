import { describe, expect, it } from "vitest";
import { ensureSlugs } from "./slugs";

describe("ensureSlugs — stabilita slugů napříč opakovaným seedem (§4, §13)", () => {
  it("keeps existing slugs unchanged and only fills in missing numbers", () => {
    const first = ensureSlugs({}, [1, 2, 3]);
    // "druhý seed" dostane výstup prvního jako vstup + jednu novou otázku.
    const second = ensureSlugs(first, [1, 2, 3, 4]);

    expect(second["1"]).toBe(first["1"]);
    expect(second["2"]).toBe(first["2"]);
    expect(second["3"]).toBe(first["3"]);
    expect(second["4"]).toBeDefined();
    expect(second["4"]).not.toBe(first["1"]);
  });

  it("running the same input twice is fully idempotent", () => {
    const map = ensureSlugs({}, [1, 2, 3]);
    const again = ensureSlugs(map, [1, 2, 3]);
    expect(again).toEqual(map);
  });

  it("never assigns the same slug to two different question numbers", () => {
    const map = ensureSlugs({}, Array.from({ length: 30 }, (_, i) => i + 1));
    const slugs = Object.values(map);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
