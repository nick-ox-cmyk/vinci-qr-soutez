import { describe, expect, it } from "vitest";
import { toQuestionDTO, toEmployeeSearchResultDTO } from "./dto";

describe("toQuestionDTO — correctOption never leaves the server (§3, §8, §13)", () => {
  it("omits correctOption even if the caller passes it through by mistake", () => {
    const rowFromDb = {
      id: "q1",
      number: 4,
      slug: "abcd23456",
      text: "Kolik vody vyteče za jeden den z kapajícího kohoutku?",
      option1: "1 litr",
      option2: "15 litrů",
      option3: "100 litrů",
      // Simuluje neopatrné předání celého Prisma řádku dál:
      correctOption: 2,
    };

    const dto = toQuestionDTO(rowFromDb);
    const serialized = JSON.stringify(dto);

    expect(serialized).not.toContain("correctOption");
    expect(dto).not.toHaveProperty("correctOption");
    expect(Object.keys(dto).sort()).toEqual(["id", "number", "option1", "option2", "option3", "slug", "text"].sort());
  });
});

describe("toEmployeeSearchResultDTO — never leaks language/externalRef (§5.1)", () => {
  it("only exposes id, fullName, companyName", () => {
    const rowFromDb = {
      id: "e1",
      fullName: "Jan Novák",
      companyName: "VINCI Energies CZ",
      language: "cs",
      externalRef: "12345",
    };

    const dto = toEmployeeSearchResultDTO(rowFromDb);
    expect(Object.keys(dto).sort()).toEqual(["companyName", "fullName", "id"]);
    expect(JSON.stringify(dto)).not.toContain("language");
    expect(JSON.stringify(dto)).not.toContain("externalRef");
  });
});
