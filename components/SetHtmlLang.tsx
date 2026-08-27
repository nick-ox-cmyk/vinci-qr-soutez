"use client";

import { useEffect } from "react";

/**
 * `<html lang>` žije v root layoutu, který je sdílený napříč celou appkou,
 * ale aktivní jazyk se určuje až na jednotlivých stránkách (§10 — z
 * `Participant.language`, na registraci z volby uživatele). Tahle drobná
 * klientská komponenta doladí atribut podle aktuální stránky.
 */
export function SetHtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = "en";
    };
  }, [lang]);

  return null;
}
