# VINCI Environment Day — QR soutěž

Interní webová QR soutěž pro zaměstnance **VINCI Energies CZ** během akce *VINCI Environment Day*.
Účastníci naskenují jeden z 30 QR kódů rozvěšených po prostorách firmy, odpoví na otázku a sbírají
skóre bez jakékoli zpětné vazby o správnosti. Plná specifikace: [`PROMPT-vinci-qr-soutez.md`](./PROMPT-vinci-qr-soutez.md).

Stack: **Next.js 15 (App Router) · TypeScript · Prisma + PostgreSQL · Tailwind CSS v4 · Recharts**.

---

## 1. Lokální spuštění

### Předpoklady

- Node.js 20+
- Postgres — nejjednodušší je lokální kontejner:
  ```bash
  docker compose up -d
  ```
  (uživatel `vinci`, heslo `vinci`, databáze `vinci_qr`, port `5432` — viz `docker-compose.yml`)

### Kroky

```bash
npm install
cp .env.example .env
npm run gen:secrets        # vygeneruje SESSION_SECRET a ADMIN_URL_TOKEN, vlož je do .env
```

Doplň do `.env`:
- `DATABASE_URL` — např. `postgresql://vinci:vinci@localhost:5432/vinci_qr` pro lokální Docker DB
- `ADMIN_PASSWORD` — heslo k výsledkové stránce, zvol si vlastní
- `NEXT_PUBLIC_BASE_URL` — pro lokální vývoj `http://localhost:3000`

```bash
npx prisma migrate dev --name init   # založí schéma v DB
npm run validate                     # zkontroluje data/employees.csv + data/questions.csv (nebo *.xlsx)
npm run seed                         # naplní DB, vygeneruje data/question-slugs.json
npm run dev                          # http://localhost:3000
```

Vzorová data v `data/` (10 zaměstnanců, 3 vyplněné otázky ve `VINCI-Environment-Day-otazky.xlsx`)
stačí na vyzkoušení celého průchodu appkou. Před ostrou akcí je nahraď skutečným obsahem — viz
[§3 Postup přípravy akce](#3-postup-přípravy-akce).

---

## 2. Nasazení na Vercel + Neon

1. **Databáze** — založ projekt na [Neon](https://neon.tech) (nebo použij Vercel Postgres). Zkopíruj
   connection string do `DATABASE_URL`.
2. **Vercel** — importuj repo, nastav environment proměnné (Production i Preview) přesně podle
   `.env.example`: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_URL_TOKEN`, `ADMIN_PASSWORD`,
   `NEXT_PUBLIC_BASE_URL`.
3. **Doména** — pokud v době prvního nasazení ještě není vybraná, nastav `NEXT_PUBLIC_BASE_URL` na
   dočasnou `*.vercel.app` adresu. **QR kódy generuj (`npm run qr`) až po nastavení finální
   domény** — viz [§15 bod 1](#otevřené-body--vědomé-kompromisy).
4. **Migrace** — buď spusť `npx prisma migrate deploy` lokálně proti produkční `DATABASE_URL`, nebo
   to zapoj do buildu (`prisma migrate deploy && next build`) v `vercel.json` / build commandu.
5. Po nasazení proveď [Postup přípravy akce](#3-postup-přípravy-akce) (seed, QR kódy, tisk).

---

## 3. Postup přípravy akce

1. Vyplň `data/employees.csv` a `data/questions.csv` **nebo** jeden sešit
   `data/VINCI-Environment-Day-otazky.xlsx` (listy `OTÁZKY` + `ZAMĚSTNANCI`) — XLSX má přednost,
   pokud v `data/` leží. Ve vzorovém sešitu i vzorových CSV jsou první řádky jen ukázkové — před
   ostrým seedem je přepiš skutečným obsahem (a smaž případné poznámkové řádky, viz
   [Co se stane, když…](#5-co-se-stane-když)).
2. `npm run validate` — ověří data bez zápisu do DB. Při chybě vypíše přesný řádek a problém.
3. `npm run seed` — zapíše do DB (idempotentně — jde spouštět opakovaně) a vygeneruje/doplní
   `data/question-slugs.json`. **Tenhle soubor commitni do repa** — je to jediný zdroj pravdy
   pro to, který QR kód vede na kterou otázku, a musí přežít i redeploy.
4. `npm run qr` — vygeneruje `out/qr/registrace.png`, `out/qr/q-01.png … q-30.png` a kontrolní
   `out/qr/qr-prehled.csv`. Pak spusť `npm run dev`, otevři `http://localhost:3000/print/qr`
   (jen v dev režimu) a vytiskni přes prohlížeč (Ctrl/Cmd+P → uložit jako PDF nebo rovnou na tiskárnu).
5. Vylepi QR kódy po prostorách firmy. `out/qr/qr-prehled.csv` použij jako soupis „který kód visí
   kde" (dopiš si k němu lokaci). K primárnímu QR kódu na plakátu přidej i **krátkou textovou URL**
   pro ruční zadání — QR čtečky v in-app prohlížečích někdy neudrží cookies mezi skeny (§9.5).
6. **Otestuj 2–3 kódy skutečným telefonem před akcí** — naskenuj, projdi registraci i otázku.

---

## 4. Výsledky

- URL: `https://<tvoje-doména>/r/<ADMIN_URL_TOKEN>` (hodnota z `.env`) → heslo (`ADMIN_PASSWORD`).
- Dashboard: KPI, vítěz, pořadí firem, celkové pořadí účastníků (řaditelné, vyhledávatelné),
  statistika otázek, 5 grafů.
- Export: tři tlačítka nahoře stáhnou `vysledky-poradi.csv`, `vysledky-odpovedi.csv`,
  `vysledky-otazky.csv` (BOM + středník — otevřou se rovnou správně v českém Excelu).
- Detail účastníka: klikni na jméno v tabulce pořadí.

Token drž v tajnosti — kdokoli s odkazem + heslem uvidí jména a výsledky všech účastníků.

### Časové metriky a rychlost (B)

Kromě počtu správných odpovědí se ukládá i přesný čas každé odpovědi (`Answer.answeredAt`,
milisekundová přesnost, `timestamptz` — vždy z databáze, nikdy z hodin klienta) a na účastníkovi
denormalizovaně `firstAnswerAt` / `lastAnswerAt` (aktualizuje je `submitAnswer` transakčně při
každém zápisu). Nic se nezahazuje ani nepředpočítává natvrdo — přesná definice „rychlostního"
vyhodnocení ještě nebyla rozhodnutá, takže tabulka pořadí i export nabízí surová data
(první/poslední odpověď, čistý čas, celkový čas, průměr mezi odpověďmi) a **volitelný** přepínač
„Zohlednit rychlost" nad tabulkou.

**Férovost:** rychlost je smysluplná jen jako kritérium při shodě v počtu správných odpovědí, ne
jako samostatné pořadí. Účastníci startují v různou dobu, mají různě daleko mezi QR kódy a
mezitím pracují — kdo se soutěži věnoval v kuse, má nutně lepší čas než kdo ji prokládal prací.
Ze stejného důvodu je **čistý čas** (první → poslední odpověď) férovější než **celkový čas** (od
registrace) jako tie-break: netrestá účastníka, který se zaregistroval brzy ráno a k hledání QR
kódů se dostal až po obědě. Výchozí pořadí (§7.2) proto zůstává beze změny — vyhrává nejvyšší
počet správných odpovědí, při shodě dřívější čas poslední odpovědi; „Zohlednit rychlost" jen
nahradí toto konkrétní kritérium shody čistým časem, nic víc.

---

## 5. Co se stane, když…

| Situace | Chování aplikace |
|---|---|
| **Telefon se vybije / ztratí se cookie** | Session cookie vydrží 60 dní, takže se to nemá stávat. Pokud přesto ano, další sken jakéhokoli `/q/{slug}` nabídne inline „Nejdřív se představ" — po znovu-nalezení jména se odpovědi zachovají (§5.3). |
| **QR kód nikdo nenajde** | Ta otázka prostě zůstane nezodpovězená, nic se nekazí — soutěž nemá povinnost odpovědět na všechno. |
| **Zaměstnanec chybí v seznamu** | Registrační stránka zobrazuje „Nenašel jsi svoje jméno? Ozvi se organizátorovi." ve všech 3 jazycích. Doplň ho do `data/employees.csv` / listu ZAMĚSTNANCI a spusť `npm run seed` znovu (idempotentní, nic nerozbije). |
| **`npm run validate` / `npm run seed` hlásí chybu na řádku, který vypadá v pořádku** | XLSX sešit má často poznámkové řádky (např. instrukce pro překladatele) se stejnou strukturou sloupců jako data — validátor je nerozliší od neúplného záznamu. Smaž je nebo přesuň mimo listy `OTÁZKY`/`ZAMĚSTNANCI`. |
| **Someone se pokusí soutěžit pod cizím jménem** | Bez PIN kódu to technicky jde (vědomý kompromis, viz níže) — `reclaimCount` ve výsledkové tabulce ukazuje, kolikrát byla identita „převzata" na jiném zařízení; vysoká hodnota je varovný signál. |
| **Potřebuješ smazat osobní data po akci** | `npm run purge` smaže `Answer` + `Participant` (GDPR, §8). `Employee`/`Company` zůstanou pro případné příští ročníky. |
| **Potřebuješ přetisknout jen několik plakátů** | Slugy jsou stabilní napříč seedy (`data/question-slugs.json`) — `npm run qr` znovu vygeneruje identické QR kódy, dokud soubor nesmažeš nebo nepoužiješ `npm run seed -- --regenerate-slugs` (velké varování + potvrzení, **rozbije všech 30 vytištěných plakátů**). |

---

## 6. Testy

```bash
npm test            # Vitest — čisté funkce (scoring, stats, slug, i18n, dto) + component testy
npm run test:e2e     # Playwright, mobilní viewport (iPhone 12)
```

Testy zapojující reálnou databázi (`submitAnswer` — dvojité odeslání, souběžné dvojité odeslání
přes unique constraint, `registerParticipant` — reclaim flow) se v `npm test` **automaticky
přeskočí**, pokud není nastavená `DATABASE_URL` — zbytek sady dál běží zeleně. Pro plné pokrytí:

```bash
docker compose up -d
DATABASE_URL="postgresql://vinci:vinci@localhost:5432/vinci_qr" npx prisma db push
DATABASE_URL="postgresql://vinci:vinci@localhost:5432/vinci_qr" npm test
```

`npm run test:e2e` potřebuje `DATABASE_URL` (samostatná/zahazovatelná DB — testy do ní seedují
vlastní fixtures z `e2e/fixtures/`, ne ostrá data z `data/`) a spuštěné Playwright prohlížeče
(`npx playwright install`).

---

## 7. Architektura — stručně

- **Tři zóny**: veřejná registrace (`/`), soutěžní (`/q/[slug]`, chráněná podepsanou cookie),
  výsledková (`/r/[token]`, tajný token v URL + heslo).
- **Server-first**: stránky jsou React Server Components, klientský JS jen tam, kde je nutná
  interakce. Jediný REST endpoint je `/api/employees/search` (potřebuje inkrementální dotazy);
  všechny mutace jdou přes Server Actions.
- **`lib/dto.ts`** je jediné místo, kde se z entity `Question` skládá objekt pro klienta —
  `correctOption` se odsud nikdy nedostane ven (ověřeno testem).
- **`lib/scoring.ts`** a **`lib/stats.ts`** jsou čisté funkce nad daty z DB, testovatelné bez
  databáze — vyhodnocení soutěže je tak jednoznačně ověřitelné.
- Detailní popis viz [`PROMPT-vinci-qr-soutez.md`](./PROMPT-vinci-qr-soutez.md) §2.1.

---

## Otevřené body / vědomé kompromisy

1. **Doména není vybraná předem** — vše čte `NEXT_PUBLIC_BASE_URL`. QR kódy (`npm run qr`) se
   proto generují **až po** nasazení na finální doménu, ne dřív.
2. **Bez PIN/hesla lze technicky soutěžit pod cizím jménem** — vědomé rozhodnutí pro interní akci.
   Detekce přes `reclaimCount` ve výsledkové tabulce.
3. **Zaměstnanec chybějící v CSV/XLSX** se nezaregistruje — registrační stránka na to má
   srozumitelnou hlášku ve všech 3 jazycích.
4. **Fonty VinciSans / VinciSerif** jsou licencované a v repu nejsou — nahrazeny Source Sans 3 /
   Source Serif 4 (Google Fonts, `latin-ext`). Až klient dodá licencované soubory, stačí upravit
   `app/fonts.ts` na `next/font/local` (viz zakomentovaný příklad přímo v souboru).
5. **Fotky a loga jsou placeholdery** — `public/wenow-badge.svg`, `public/vinci-energies-logo.svg`
   a fotografický pás na `/` (aktuálně CSS gradient) je nutné před ostrým nasazením nahradit
   oficiálními assety z brand manuálu VINCI Energies / dodaných materiálů.
6. **Barvy** (`app/globals.css`, `:root`) jsou odečtené z dodaných PDF (diplom + plakát), ne
   z oficiálního brand manuálu — ideálně před spuštěním ověřit.
7. **`xlsx` (SheetJS) balíček** má v `npm audit` starší známé nálezy (prototype pollution v
   nepoužívaných cestách) — knihovna se používá jen lokálně v `scripts/` nad důvěryhodnými
   vstupními soubory připravenými organizátorem, ne za běhu aplikace nad veřejným vstupem, takže
   riziko je omezené. Přesto stojí za zvážení před dalším ročníkem zkontrolovat aktuální stav.
