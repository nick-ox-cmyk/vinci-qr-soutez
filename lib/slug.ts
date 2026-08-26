import { randomBytes } from "crypto";

/**
 * Abeceda bez 0/o/1/l/i — slug se dá v nouzi přepsat ručně bez záměny znaků.
 * 31 znaků, 9místný slug => prostor ≈ 31^9 ≈ 2,6 × 10^13.
 */
export const SLUG_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export const SLUG_LENGTH = 9;

/**
 * Vygeneruje kryptograficky bezpečný náhodný slug. Nemá žádný vztah k číslu
 * otázky ani k pořadí — volající si vazbu number -> slug musí uložit sám
 * (viz scripts/seed.ts a data/question-slugs.json).
 */
export function generateSlug(length: number = SLUG_LENGTH): string {
  const alphabetLen = SLUG_ALPHABET.length;
  // Odmítni bajty >= maxByte, aby modulo nezvýhodňovalo nižší znaky abecedy.
  const maxByte = Math.floor(256 / alphabetLen) * alphabetLen;

  let result = "";
  while (result.length < length) {
    const bytes = randomBytes(length * 2);
    for (const byte of bytes) {
      if (result.length >= length) break;
      if (byte >= maxByte) continue;
      result += SLUG_ALPHABET[byte % alphabetLen];
    }
  }
  return result;
}

/** Ověří, že řetězec je syntakticky platný slug (délka + abeceda). */
export function isValidSlugFormat(value: string): boolean {
  if (value.length !== SLUG_LENGTH) return false;
  return [...value].every((ch) => SLUG_ALPHABET.includes(ch));
}
