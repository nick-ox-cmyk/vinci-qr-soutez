import fs from "fs";
import { generateSlug } from "../../lib/slug";

/**
 * §4 — stabilita slugů je kritická (vytištěné QR kódy na zdi). Načte
 * existující mapu `data/question-slugs.json` (číslo otázky → slug) a doplní
 * chybějící čísla novými, garantovaně unikátními slugy. Existující slugy se
 * NIKDY nemění (mimo explicitní `--regenerate-slugs`, které mapu předá
 * prázdnou).
 */
export function loadSlugMap(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf-8");
  if (!raw.trim()) return {};
  return JSON.parse(raw) as Record<string, string>;
}

export function saveSlugMap(filePath: string, map: Record<string, string>): void {
  const sorted = Object.fromEntries(Object.entries(map).sort((a, b) => Number(a[0]) - Number(b[0])));
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
}

export function ensureSlugs(map: Record<string, string>, questionNumbers: number[]): Record<string, string> {
  const used = new Set(Object.values(map));
  const result = { ...map };
  for (const number of questionNumbers) {
    const key = String(number);
    if (result[key]) continue;
    let slug = generateSlug();
    while (used.has(slug)) slug = generateSlug();
    used.add(slug);
    result[key] = slug;
  }
  return result;
}
