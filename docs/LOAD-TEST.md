# Zátěžový test — 4000 účastníků

**Datum testu:** 27. 8. 2026
**Proti:** izolovaná Neon větev `load-test` (branch z produkčního projektu `vinci-qr-soutez`,
copy-on-write klon — žádná ostrá data nebyla ohrožena), smazána po testu.
**Skript:** [`scripts/load-test.ts`](../scripts/load-test.ts)

## Co se testovalo a proč

Aplikace na Vercelu škáluje elasticky per-request — to není potřeba testovat. Skutečný sdílený
bottleneck při ~4000 účastnících je **databáze**, takže test cílí přímo na ni: stejné dotazové
a transakční vzory jako `app/actions/*.ts`, spouštěné se souběžností 200 (tj. 200 souběžných
"virtuálních uživatelů" bez čekání mezi požadavky — reálnější provoz s lidmi, co si čtou otázku
a rozmýšlí odpověď, bude na DB méně náročný, než co je tady naměřené).

## Výsledky

| Test | Požadavků | Chyb | Throughput | p50 | p95 | p99 |
|---|---:|---:|---:|---:|---:|---:|
| 1) Vyhledávání zaměstnanců (typeahead) | 2 000 | 0 | 621 req/s | 222 ms | 1 090 ms | 1 187 ms |
| 2) Registrace (Participant create) | 4 000 | 0 | 374 req/s | 520 ms | 593 ms | 643 ms |
| 3) Odpovědi (transakce = `submitAnswer`) | 4 000 | 0 | 467 req/s | 414 ms | 481 ms | 500 ms |
| 4) Duplicitní odpovědi na tytéž otázky | 4 000 | **4 000/4 000 správně odmítnuto** | — | — | — | — |
| 5) Dashboard agregace (`/r/[token]`) souběžně | 50 | 0 | 52 req/s | 405 ms | 500 ms | 504 ms |

**Nula chyb ve všech testech.** Test 4 potvrzuje, že unique constraint `(participantId, questionId)`
drží i při 200 souběžných pokusech odpovědět na už zodpovězenou otázku — přesně to, co
`submitAnswer` (§6.2) předpokládá.

## Závěr pro 4000 účastníků / pondělní peak

I na nejnižším Neon compute (bez jakéhokoli manuálního navýšení) zvládla DB 4000 registrací
a 4000 odpovědí v transakcích **bez jediné chyby**, s p99 latencí pod 1,2 s i u nejnáročnějšího
testu (vyhledávání). To je bezpečná rezerva — reálný provoz nikdy nebude mít 200 lidí, co odešlou
odpověď v tomtéž okamžiku bez prodlevy.

## Doporučení před ostrou akcí

1. **Neon compute** — přesto před pondělním peakem v Neon Console (Branches → production →
   Compute) zkontroluj/nastav `autoscaling limit` na aspoň **1–2 CU** (výchozí bývá 0.25–1 CU)
   a na dobu akce **vypni scale-to-zero** (suspend), ať první příchozí ráno nečekají na probuzení
   databáze studeným startem. Stačí na den dopředu, kdy visí QR kódy, přes celý týden soutěže.
2. **Rate limiting je in-memory, ne globální** (§8) — při tisících požadavcích rozprostřených přes
   desítky Vercel serverless instancí efektivně povolí víc než nastavené číslo, protože každá
   instance počítá zvlášť. Appku to nerozbije (DB unique constraint pořád chrání proti
   duplicitám — viz test 4 výše), jen to není přesný rate limit. Pro tuhle akci to není potřeba
   řešit; `lib/ratelimit.ts` je připravené na výměnu za Upstash Redis, kdyby to bylo v budoucnu
   potřeba přesně.
3. **Pooled connection string** — appka už `DATABASE_URL` (ne `DATABASE_URL_UNPOOLED`) používá
   správně, nic měnit netřeba.
4. **Zopakuj test před ostrou akcí**, pokud se mezitím výrazně změní datový model nebo přibude
   nová těžká agregace — je to jeden příkaz proti čerstvé Neon větvi, žádné riziko pro produkci:
   ```bash
   npx neon branch create --name load-test
   DATABASE_URL="<pooled connection string větve>" \
     LOAD_TEST_CONFIRM=yes-this-is-a-disposable-branch \
     npx tsx scripts/load-test.ts
   npx neon branch delete load-test
   ```
