import type { Language } from "@prisma/client";
import cs from "@/messages/cs.json";
import hu from "@/messages/hu.json";
import pl from "@/messages/pl.json";

export const SUPPORTED_LANGUAGES: Language[] = ["cs", "hu", "pl"];

const dictionaries: Record<Language, typeof cs> = { cs, hu, pl };

export type Dictionary = typeof cs;

export function getDictionary(language: Language): Dictionary {
  return dictionaries[language] ?? dictionaries.cs;
}

/**
 * Načte hodnotu z tečkové cesty (`"question.savedTitle"`) a nahradí
 * `{placeholder}` tokeny. Chybějící klíč = fallback na klíč samotný + warning
 * (mělo by se stát jen při rozbitém překladu, ne v běžném provozu).
 */
export function t(
  dict: Dictionary,
  key: string,
  params?: Record<string, string | number>
): string {
  const value = key
    .split(".")
    .reduce<unknown>((acc, part) => (acc as Record<string, unknown> | undefined)?.[part], dict);

  if (typeof value !== "string") {
    console.warn(`[i18n] Chybějící klíč překladu: "${key}"`);
    return key;
  }

  if (!params) return value;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replaceAll(`{${k}}`, String(v)),
    value
  );
}

export function isSupportedLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as string[]).includes(value);
}
