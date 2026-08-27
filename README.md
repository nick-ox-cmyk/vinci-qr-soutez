# ENVI QUIZ — VINCI Energies CEE

Interní webová QR soutěž pro zaměstnance **VINCI Energies CEE** (regionu střední a východní Evropy)
během akce *Environment Day*. Účastníci naskenují jeden z 30 QR kódů rozvěšených po prostorách
firmy, odpoví na otázku a sbírají skóre bez jakékoli zpětné vazby o správnosti.
Plná specifikace: [`PROMPT-vinci-qr-soutez.md`](./PROMPT-vinci-qr-soutez.md).

**7 jazyků**: CZ · SK · PL · HU · RO · BG · EN (výchozí). Očekávaný rozsah: až ~4000 účastníků,
soutěž běží jeden týden s peakem v pondělí — viz [§8 Výkon a zátěž](#8-výkon-a-zátěž-4000-účastníků).

Stack: **Next.js 15 (App Router) · TypeScript · Prisma + PostgreSQL (Neon) · Tailwind CSS v4 · Recharts**.

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
- `COMPETITION_START_AT` / `COMPETITION_END_AT` — volitelné, viz [§9 Časové okno soutěže](#9-časové-okno-soutěže).
  Pro lokální testování mimo ostré datum si je dočasně nastav do minulosti/budoucnosti.

```bash
npx prisma migrate dev --name init   # založí schéma v DB
npm run validate                     # zkontroluje data/employees.csv + data/questions.csv (nebo *.xlsx)
npm run seed                         # naplní DB, vygeneruje data/question-slugs.json
npm run dev                          # http://localhost:3000
```

Vzorová data v `data/` (18 zaměstnanců napříč všemi 7 jazyky, 3 vyplněné otázky ve
`VINCI-Environment-Day-otazky.xlsx`) stačí na vyzkoušení celého průchodu appkou. Před ostrou akcí
je nahraď skutečným obsahem — viz [§3 Postup přípravy akce](#3-postup-přípravy-akce).

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
   pokud v `data/` leží. List `OTÁZKY` má 30 sloupců: číslo, správná odpověď a pak 7 bloků po
   4 sloupcích (text + 3 odpovědi) v pořadí **CZ · SK · PL · HU · RO · BG · EN**. Ve vzorovém
   sešitu i vzorových CSV jsou první řádky jen ukázkové — před ostrým seedem je přepiš skutečným
   obsahem.
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
| **Zaměstnanec chybí v seznamu** | Registrační stránka zobrazuje „Tvé jméno se nezobrazilo? Napiš mail na thavlickova@vinci-energies.cz" ve všech 7 jazycích. Doplň ho do `data/employees.csv` / listu ZAMĚSTNANCI a spusť `npm run seed` znovu (idempotentní, nic nerozbije). |
| **`npm run validate` / `npm run seed` hlásí chybu na řádku, který vypadá v pořádku** | XLSX sešit má často poznámkové řádky (např. instrukce pro překladatele) se stejnou strukturou sloupců jako data — validátor je nerozliší od neúplného záznamu. Smaž je nebo přesuň mimo listy `OTÁZKY`/`ZAMĚSTNANCI` (aktuální vzorový sešit už žádný takový řádek neobsahuje). |
| **Někdo naskenuje QR kód mimo časové okno soutěže** | Zobrazí se „MOC BRZY!" (před startem) nebo „Soutěž je ukončena…" (po konci) ve zvoleném jazyce — žádný formulář se nevykreslí, `registerParticipant`/`submitAnswer` navíc odmítnou zápis i při přímém volání (obrana do hloubky). Viz [§9 Časové okno soutěže](#9-časové-okno-soutěže). |
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

## 8. Výkon a zátěž (4000 účastníků)

Očekávaný rozsah: až ~4000 registrovaných účastníků napříč celým CEE regionem, soutěž běží jeden
týden, největší nápor v pondělí ráno (start okna). Zátěžový test proti izolované Neon větvi a
konkrétní doporučení na plán/compute jsou v [`docs/LOAD-TEST.md`](./docs/LOAD-TEST.md) — shrnutí:

- **Rate limiting je in-memory** (§8 v `PROMPT-vinci-qr-soutez.md`) — funguje per serverless
  instance, ne globálně napříč nimi. Pro pár stovek lidí to stačilo; při tisících souběžných
  požadavků rozprostřených přes desítky Vercel instancí limity efektivně povolí víc, než je
  nastavené číslo. Funkčně to appku nerozbije (DB unique constraint pořád chrání proti duplicitám),
  jen to není přesný rate limit. Až bude reálná potřeba přesného limitu, `lib/ratelimit.ts` je
  navržené tak, aby šlo implementaci prohodit za Upstash Redis beze změny volajícího kódu.
- **Neon compute** — free/nejnižší tier běžně škáluje na 0.25–1 CU a při neaktivitě uspává
  (studený start při první žádosti po pauze). Pro pondělní špičku se stovkami souběžných požadavků
  doporučujeme před akcí dočasně navýšit `autoscalingLimitMaxCu` (Neon Console → Compute) a zvážit
  vypnutí scale-to-zero na dobu trvání soutěže, ať první příchozí nečekají na probuzení databáze.
- **Vercel serverless funkce** škálují automaticky, žádný zásah není potřeba — jen je dobré vědět,
  že to znamená víc souběžných DB connections, proto je důležité používat **pooled** connection
  string z Neonu (`DATABASE_URL`, ne `DATABASE_URL_UNPOOLED`) — aplikace to už tak má.

---

## 9. Časové okno soutěže

QR kódy visí den dopředu, ale odpovídat jde jen v daném okně (`lib/competition-window.ts`):

```bash
COMPETITION_START_AT="2026-09-14T06:00:00.000Z"   # 14. 9. 8:00 CEST / 9:00 EEST (RO, BG)
COMPETITION_END_AT="2026-09-18T14:00:00.000Z"     # 18. 9. 16:00 CEST / 17:00 EEST (RO, BG)
```

Obě proměnné jsou nepovinné (výchozí hodnoty odpovídají výše) — nastav je v `.env` / Vercel env,
pokud se termín posune. Je to **jeden konkrétní okamžik v UTC**; RO/BG vidí čas o hodinu později
jen proto, že jsou v EEST časové zóně (o hodinu napřed před CEST) — nic se nedopočítává ručně, jen
se pro zobrazení vybere správná časová zóna podle jazyka účastníka.

Mimo okno se `/` i `/q/{slug}` chovají stejně pro registrovaného i neregistrovaného účastníka —
místo formuláře/otázky se zobrazí „MOC BRZY!" resp. „Soutěž je ukončena…" v jeho jazyce (nebo
s přepínačem jazyka, pokud ho ještě neznáme). `registerParticipant` a `submitAnswer` mimo okno
odmítnou zápis i při přímém volání (obrana do hloubky, ne jen UI).

**Pro lokální testování mimo ostré datum** si do `.env` dočasně nastav širší okno, např.:
```bash
COMPETITION_START_AT="2020-01-01T00:00:00.000Z"
COMPETITION_END_AT="2030-01-01T00:00:00.000Z"
```

### Obejití zámku na nasazené (ostré) URL

Měnit `COMPETITION_START_AT`/`END_AT` na Vercelu jen kvůli otestování appky před termínem
znamená pokaždé redeploy a riziko, že se pozapomene vrátit zpět. Místo toho existuje `COMPETITION_BYPASS_TOKEN` —
nepovinná env proměnná, po jejímž nastavení jde zámek dočasně obejít **jen v tom prohlížeči**, kde
o tom někdo ví:

1. `npm run gen:secrets` vypíše i `COMPETITION_BYPASS_TOKEN` — vlož ho do Vercel env (Production).
2. Kdokoli s odkazem `https://<tvoje-doména>/api/bypass?token=<ten_token>` dostane HttpOnly
   cookie a appka se mu chová, jako by okno soutěže bylo otevřené — registrace i odpovídání
   fungují normálně, včetně kontroly na serveru (`registerParticipant`/`submitAnswer`), ne jen
   na stránce.
3. Bez správného tokenu v URL se nic nestane (tichý redirect na `/`) — jde to bezpečně poslat
   komukoli k otestování, nikomu jinému to nefunguje.

**Až bude appka na ostré doméně, `COMPETITION_BYPASS_TOKEN` z Vercel env smaž.** Bez něj
`isValidBypassToken` (`lib/session.ts`) vrací vždy `false` — i staré cookie od testerů z kroku 2
tím okamžitě přestanou platit, žádná změna kódu ani redeploy navíc není potřeba.

---

## Otevřené body / vědomé kompromisy

1. **Doména není vybraná předem** — vše čte `NEXT_PUBLIC_BASE_URL`. QR kódy (`npm run qr`) se
   proto generují **až po** nasazení na finální doménu, ne dřív.
2. **Bez PIN/hesla lze technicky soutěžit pod cizím jménem** — vědomé rozhodnutí pro interní akci.
   Detekce přes `reclaimCount` ve výsledkové tabulce.
3. **Zaměstnanec chybějící v CSV/XLSX** se nezaregistruje — registrační stránka na to má
   srozumitelnou hlášku ve všech 7 jazycích.
4. **Fonty VinciSans / VinciSerif** jsou licencované a v repu nejsou — nahrazeny Source Sans 3 /
   Source Serif 4 (Google Fonts, `latin-ext` + `cyrillic` kvůli bulharštině). Až klient dodá
   licencované soubory, stačí upravit `app/fonts.ts` na `next/font/local` (viz zakomentovaný
   příklad přímo v souboru) — ověř, že licencované řezy mají i cyrilici.
5. **Logo a favicon** — `public/vinci-energies-logo.svg` a `public/favicon.png` jsou reálné
   dodané assety (ne placeholder). Registrační stránka je záměrně čistě formulářová — bez
   fotografického pásu ani dekorativních odznaků.
6. **Barvy** (`app/globals.css`, `:root`) jsou odečtené z dodaných PDF (diplom + plakát), ne
   z oficiálního brand manuálu — ideálně před spuštěním ověřit.
7. **`xlsx` (SheetJS) balíček** má v `npm audit` starší známé nálezy (prototype pollution v
   nepoužívaných cestách) — knihovna se používá jen lokálně v `scripts/` nad důvěryhodnými
   vstupními soubory připravenými organizátorem, ne za běhu aplikace nad veřejným vstupem, takže
   riziko je omezené. Přesto stojí za zvážení před dalším ročníkem zkontrolovat aktuální stav.
8. **Nové jazyky (SK, RO, BG) — UI texty jsou strojově/AI přeložené**, ne od rodilého mluvčího.
   Otázky cs/hu/pl mají reálné firemní překlady; sk/ro/bg/en vzorové otázky v `data/` jsou taky jen
   AI překlad pro účely testování. **Před ostrým seedem nech UI texty (`messages/sk.json`,
   `messages/ro.json`, `messages/bg.json`) i skutečný obsah otázek zkontrolovat rodilým mluvčím.**
9. **`Question.number` a `correctOption` se needitují needitovatelně napříč jazyky** — pokud se
   při doplňování RO/BG/SK/EN překladů omylem prohodí pořadí odpovědí oproti českému vzoru,
   validátor to nepozná (kontroluje jen že pole nejsou prázdná, ne významovou shodu pořadí). Po
   doplnění nových jazyků udělej ruční kontrolu na pár náhodných otázkách.
