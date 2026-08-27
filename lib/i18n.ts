import type { Language } from "@prisma/client";
import cs from "@/messages/cs.json";
import sk from "@/messages/sk.json";
import pl from "@/messages/pl.json";
import hu from "@/messages/hu.json";
import ro from "@/messages/ro.json";
import bg from "@/messages/bg.json";
import en from "@/messages/en.json";

// Pořadí odpovídá zadání CZ(cs)-SK-PL-HU-RO-BG-EN. `en` je výchozí jazyk
// přepínače na registraci i fallback při chybějícím překladu.
export const SUPPORTED_LANGUAGES: Language[] = ["cs", "sk", "pl", "hu", "ro", "bg", "en"];
export const DEFAULT_LANGUAGE: Language = "en";

const dictionaries: Record<Language, typeof en> = { cs, sk, pl, hu, ro, bg, en };

export type Dictionary = typeof en;

export function getDictionary(language: Language): Dictionary {
  return dictionaries[language] ?? dictionaries[DEFAULT_LANGUAGE];
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
