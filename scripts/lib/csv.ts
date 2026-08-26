/**
 * Malý, závislostí prostý parser oddělovaných souborů (§11.1, §11.2).
 * Podporuje `;` jako oddělovač, uvozovkové pole (s `""` jako escapovanou
 * uvozovkou uvnitř) a BOM na začátku souboru — Excel je běžně produkuje.
 */
export function parseDelimited(raw: string, delimiter = ";"): string[][] {
  // Odstraň BOM a normalizuj konce řádků.
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  // Poslední pole/řádek, pokud soubor nekončí novým řádkem.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Zahoď zcela prázdné řádky (typicky konec souboru).
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}
