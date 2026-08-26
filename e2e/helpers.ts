import fs from "fs";
import path from "path";

const FIXTURES_DIR = path.join(process.cwd(), "e2e", "fixtures");

export function getFixtureSlug(questionNumber: number): string {
  const slugsPath = path.join(FIXTURES_DIR, "question-slugs.json");
  const map: Record<string, string> = JSON.parse(fs.readFileSync(slugsPath, "utf-8"));
  const slug = map[String(questionNumber)];
  if (!slug) throw new Error(`Fixture slug pro otázku ${questionNumber} nenalezen — proběhl globalSetup?`);
  return slug;
}

export const FIXTURE_EMPLOYEES = {
  cs: { searchTerm: "E2E Testerová", fullName: "E2E Testerová Česká" },
  hu: { searchTerm: "E2E Tesztelő", fullName: "E2E Tesztelő Magyar" },
  pl: { searchTerm: "E2E Testerka", fullName: "E2E Testerka Polska" },
};
