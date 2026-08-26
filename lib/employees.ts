/**
 * Sdílená normalizace jména pro `Employee.searchName` — používá jak seed
 * skript (při zápisu), tak vyhledávací endpoint (při čtení, pro normalizaci
 * dotazu uživatele). Musí zůstat identická na obou místech.
 */
export function normalizeSearchName(fullName: string): string {
  return (
    fullName
      // Polské Ł/ł je samostatné písmeno s příčkou, ne "l" + kombinující
      // diakritika — Unicode NFD ho proto nerozloží a `\p{Diacritic}` ho
      // neodstraní. Bez téhle výjimky by kolega bez polské klávesnice
      // "Łukasz" nikdy nedohledal jako "lukasz" (§5.1 — hledání bez ohledu
      // na diakritiku).
      .replace(/[łŁ]/g, "l")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim()
  );
}
