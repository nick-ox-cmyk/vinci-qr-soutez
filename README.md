# ENVI QUIZ — VINCI Energies CEE

Interní webová QR soutěž pro zaměstnance **VINCI Energies CEE** (regionu střední a východní Evropy)
během akce *Environment Day*. Účastníci naskenují jeden z 20 QR kódů rozvěšených po prostorách
firmy, odpoví na otázku a sbírají skóre bez jakékoli zpětné vazby o správnosti.
Plná specifikace: [`PROMPT-vinci-qr-soutez.md`](./PROMPT-vinci-qr-soutez.md) — pozor, ten dokument
je původní zadání a v pár detailech je od dohody v tomhle README zastaralý (nejvýrazněji: mluví
o 30 otázkách, ostrý počet je teď 20 — viz [§10 Doména a nasazení](#10-doména-a-nasazení)).

**Doména**: `enviquiz.com` **je živá a míří na appku** — hosting se od 30. 8. přesunul z Vercelu/Neonu
na vlastní VPS, viz [§10 Doména a nasazení](#10-doména-a-nasazení) pro aktuální stav i historii
téhle změny.

**7 jazyků**: CZ · SK · PL · HU · RO · BG · EN (výchozí). Očekávaný rozsah: až ~4000 účastníků,
soutěž běží jeden týden s peakem v pondělí — viz [§8 Výkon a zátěž](#8-výkon-a-zátěž-4000-účastníků).

Stack: **Next.js 15 (App Router) · TypeScript · Prisma + PostgreSQL · Tailwind CSS v4 · Recharts**.
Produkční PostgreSQL běží samostatně na VPS (§10) — projekt původně vznikl na Vercelu + Neonu,
ta cesta je zachovaná jako alternativa v [§2](#2-nasazení-na-vercel--neon).

---

## 0. Předání projektu — přečti si tohle jako první

Tuhle sekci čti, pokud přebíráš projekt (nasazení, doména, případně škálování databáze) a nebyl jsi
u toho, jak vznikal. Zbytek README je referenční dokumentace k appce samotné — tahle sekce je jen
orientace „kde co je" a „co ještě zbývá udělat".

### Kde je co (přístupy)

| Co | Kde | Poznámka |
|---|---|---|
| **Kód** | [github.com/nick-ox-cmyk/vinci-qr-soutez](https://github.com/nick-ox-cmyk/vinci-qr-soutez), větev `main` | **Repo je od 30. 8. veřejné** (kvůli viditelnosti GitHub Actions běhů komukoli s odkazem) — pokud to vadí, dá se vrátit na privátní, jen se pak musí řešit přístup jinak (Actions runy vidí jen lidé s právy do repa). V historii nejsou žádné reálné secrets (ověřeno, viz [§10](#10-doména-a-nasazení)). |
| **Hosting** | Vlastní VPS, `157.90.169.205`, kód v `/opt/enviquiz`, proces `enviquiz` pod PM2, port 4600, Node 22; nginx + Let's Encrypt vpředu | Nasazeno automaticky z `main` přes GitHub Actions (`.github/workflows/deploy.yml`) — viz [§10](#10-doména-a-nasazení). Starý Vercel projekt (`vinci-qr-soutez`, team `nick-coxs-projects-c657872a`, `vinci-qr-soutez.vercel.app`) pořád běží souběžně, ale nic na něj neukazuje — kandidát na vypnutí. |
| **Databáze** | Samostatný PostgreSQL 16 přímo na VPS, databáze `vinci_qr`, vlastní uživatel | **Není to už Neon** — produkční data od ~2. 9. žijí jen tady, Neon projekt (`vinci-qr-soutez`, id `snowy-frog-38149029`) je od té doby nečinný a obsahuje jen starou testovací kopii. Zálohování téhle DB (na rozdíl od Neonu) teď není automatické — ověř, jestli VPS má nastavené pravidelné `pg_dump`/snapshoty, než se spolehneš na `npm run purge` nebo cokoliv nevratného. |
| **Doména** | `enviquiz.com` + `www.enviquiz.com` | Živá, DNS míří na VPS výše, TLS přes Let's Encrypt s automatickou obnovou. |
| **Tajné hodnoty (secrets)** | `.env` přímo na VPS (`/opt/enviquiz/.env`, mimo git) + GitHub → repo → Settings → Secrets and variables → Actions (`SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`) | **Všechny hodnoty jsou od 30. 8. jiné než dřív** — starý Vercel `ADMIN_URL_TOKEN`/`ADMIN_PASSWORD`/bypass token **už neplatí**. Nové přihlašovací údaje k `/r/<token>` má zadavatel; k `.env` na serveru samotném potřebuješ SSH přístup na VPS. |
| **Dotazy k obsahu/rozhodnutím** | Daniel (zadavatel), `daniel.kokes@gmail.com` | Zejména cokoliv kolem otevřených bodů níže — placeholder otázky, termín akce, kontaktní e-mail v appce (`thavlickova@vinci-energies.cz`, viz [§5](#5-co-se-stane-když)). |

### Rychlý start

```bash
git clone https://github.com/nick-ox-cmyk/vinci-qr-soutez.git
cd vinci-qr-soutez
npm install
cp .env.example .env         # a vyplň hodnotami z /opt/enviquiz/.env na VPS (potřebuješ SSH přístup)
npm run dev                  # http://localhost:3000
```

Pokud SSH přístup na VPS ještě nemáš, postupuj podle [§1 Lokální spuštění](#1-lokální-spuštění) —
založ si `.env` s lokální Postgres přes `docker compose up -d`, to stačí na vyzkoušení celého
průchodu appkou bez přístupu k ostré databázi. Nasazování samotné (§10) přístup na VPS vyžaduje,
ale běžný vývoj/testování appky ne.

### Stav ke dni napojení domény (2.–9. 9.)

Nasazení, doména i rychlejší databáze **už jsou hotové** (viz tabulka výše a [§10](#10-doména-a-nasazení))
— appka teď reálně běží na `enviquiz.com`. Zbývá hlavně obsah a provozní úklid před ostrým startem:

1. **Skutečné otázky 1–20 a kompletní seznam zaměstnanců od zadavatele** — teď je v `data/` pořád
   vzorový obsah, otázky 4–20 jsou čistě AI placeholder (bod 8 v Otevřených bodech níže). Až dorazí
   reálný obsah: aktualizuj `data/VINCI-Environment-Day-otazky.xlsx`, pak na VPS
   `npm run validate` a `npm run seed` (přes SSH, nebo si to zapoj do deploy workflow).
2. **Rodilý mluvčí zkontroluje překlady SK/RO/BG** (`messages/sk.json`, `messages/ro.json`,
   `messages/bg.json`) — zatím jsou jen AI přeložené.
3. **`npm run qr` na VPS až po finálním obsahu** — doména už je ostrá, takže vygenerované QR kódy
   budou rovnou správně bez dalšího přegenerování. Pak vytisknout a rozvěsit (§3).
4. **Před ostrým startem**: `npm run purge` (smaže testovací registrace nasbírané při vývoji) a
   odstranit `COMPETITION_BYPASS_TOKEN` z `.env` na VPS (§9) — bez něj přestane fungovat i stará
   bypass cookie u kohokoli, kdo appku předtím testoval.
5. **Rozhodnout o starém Vercel projektu a Neon databázi** — obě pořád existují a nic na ně
   neukazuje. Bezpečné vypnout, jen ať neběží dvě kopie appky/dvě účtované databáze zbytečně.
6. **Zálohy produkční databáze** — Neon měl branching/PITR zabudovaný, samostatný Postgres na VPS
   ho nemá automaticky. Ověř na serveru, jestli je nastavené pravidelné zálohování (`pg_dump` cron,
   snapshoty VPS providera), než začnou chodit ostré registrace.

### Pokud přece jen budeš řešit škálování databáze

I když produkční DB teď běží lokálně na VPS (ne na Neonu), postup při nedostatečném výkonu je
principiálně stejný — jen nástroje jsou jiné:

- **Výkon/kapacita** (appka je pod zátěží pomalá, ne že by chyběla data) → zkontroluj zdroje VPS
  (CPU/RAM/disk I/O) a `max_connections`/sdílenou paměť Postgresu; případně přejít na větší VPS.
  [`docs/LOAD-TEST.md`](./docs/LOAD-TEST.md) obsahuje metodiku zátěžového testu (byl dělaný ještě
  proti Neonu, ale postup — testovat DB vrstvu přímo, ne přes HTTP — platí stejně).
- **Struktura dat nestačí** (potřeba nové pole/tabulka) → uprav `prisma/schema.prisma`, lokálně
  `npx prisma migrate dev --name <popis>` (vytvoří migraci v `prisma/migrations/`), ověř na
  zahazovatelné kopii DB, commitni migraci a nech ji aplikovat přes běžný deploy (`prisma migrate
  deploy` je součástí `.github/workflows/deploy.yml`, §10). Nikdy needituj schéma appky přímo SQL
  příkazem na VPS bez odpovídající Prisma migrace v repu — příští deploy by pak spadl na nesouladu.

### Užitečné příkazy

| Příkaz | Co dělá |
|---|---|
| `npm run dev` | Lokální vývojový server |
| `npm run build` | Produkční build (stejný krok, jaký pouští deploy workflow na VPS) |
| `npm test` / `npm run test:e2e` | Vitest / Playwright — viz [§6](#6-testy) |
| `npm run validate` | Zkontroluje `data/*.csv`/`*.xlsx` bez zápisu do DB |
| `npm run seed` | Zapíše zaměstnance/otázky do DB, vygeneruje `data/question-slugs.json` |
| `npm run qr` | Vygeneruje QR kódy (PNG + SVG s místem na logo) z `NEXT_PUBLIC_BASE_URL` |
| `npm run purge` | Smaže `Participant`/`Answer` (GDPR úklid po akci) |
| `npm run load-test` | Zátěžový test proti (ideálně) izolované Neon větvi, viz `docs/LOAD-TEST.md` |
| `npx prisma studio` | Vizuální prohlížeč obsahu databáze |
| `git push origin main` | Nasadí na produkci (VPS) automaticky přes GitHub Actions, §10 |

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

> Tohle byla **původní** nasazovací cesta a appka na ní i dnes technicky funguje (odkazovaný Vercel
> projekt pořád běží), ale **produkce od 30. 8. běží jinde** — na vlastním VPS, viz
> [§10 Doména a nasazení](#10-doména-a-nasazení). Tuhle sekci nech jako zálohu/alternativu (např.
> kdyby se VPS řešení nevyplatilo), ne jako popis aktuálního stavu.

1. **Databáze** — založ projekt na [Neon](https://neon.tech) (nebo použij Vercel Postgres). Zkopíruj
   connection string do `DATABASE_URL`.
2. **Vercel** — importuj repo, nastav environment proměnné (Production i Preview) přesně podle
   `.env.example`: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_URL_TOKEN`, `ADMIN_PASSWORD`,
   `NEXT_PUBLIC_BASE_URL`.
3. **Doména** — je vybraná (`enviquiz.com`), ale zatím se testuje na dočasné `*.vercel.app`
   adrese. `NEXT_PUBLIC_BASE_URL` zatím nech na `*.vercel.app`. **QR kódy generuj (`npm run qr`)
   až po přepnutí `NEXT_PUBLIC_BASE_URL` na `enviquiz.com`**, ne dřív — viz
   [§10 Doména a nasazení](#10-doména-a-nasazení).
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
4. `npm run qr` — vygeneruje `out/qr/registrace.png`, `out/qr/q-01.png … q-20.png` a kontrolní
   `out/qr/qr-prehled.csv`. Vedle toho i vektorovou variantu `out/qr/svg/*.svg` — **se schváleným
   volným místem uprostřed na logo** VINCI Energies (klient si logo doplňuje sám v grafickém
   programu; rozměr díry je `LOGO_HOLE_FRACTION` v `scripts/qr.ts`, 30 % šířky kódu, uvnitř
   bezpečné rezervy korekce chyb H). Pak spusť `npm run dev`, otevři `http://localhost:3000/print/qr`
   (jen v dev režimu) a vytiskni přes prohlížeč (Ctrl/Cmd+P → uložit jako PDF nebo rovnou na tiskárnu) —
   nebo si plakát vysaď vlastním grafickým layoutem kolem `out/qr/svg/*.svg`.
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
| **Potřebuješ přetisknout jen několik plakátů** | Slugy jsou stabilní napříč seedy (`data/question-slugs.json`) — `npm run qr` znovu vygeneruje identické QR kódy, dokud soubor nesmažeš nebo nepoužiješ `npm run seed -- --regenerate-slugs` (velké varování + potvrzení, **rozbije všech 20 vytištěných plakátů**). |

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

> Zátěžový test i doporučení níže vznikly ještě pro nasazení na Vercel + Neon (§2). Produkce od
> 30. 8. běží na vlastním VPS se samostatným Postgresem (§10) — obecná metodika (testovat DB vrstvu
> přímo, ne přes HTTP) i body o rate limitingu platí beze změny, ty specificky o Neon
> autoscalingu/compute už ne. Před ostrým startem stojí za to udělat ekvivalentní kontrolu kapacity
> přímo na VPS (CPU/RAM, `max_connections` Postgresu) — viz [§0](#0-předání-projektu--přečti-si-tohle-jako-první).

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

1. `npm run gen:secrets` vypíše i `COMPETITION_BYPASS_TOKEN` — vlož ho do `.env` produkčního
   nasazení (aktuálně `/opt/enviquiz/.env` na VPS, §10).
2. Kdokoli s odkazem `https://<tvoje-doména>/api/bypass?token=<ten_token>` dostane HttpOnly
   cookie a appka se mu chová, jako by okno soutěže bylo otevřené — registrace i odpovídání
   fungují normálně, včetně kontroly na serveru (`registerParticipant`/`submitAnswer`), ne jen
   na stránce.
3. Bez správného tokenu v URL se nic nestane (tichý redirect na `/`) — jde to bezpečně poslat
   komukoli k otestování, nikomu jinému to nefunguje.

**Před ostrým startem soutěže `COMPETITION_BYPASS_TOKEN` z produkčního `.env` smaž.** Bez něj
`isValidBypassToken` (`lib/session.ts`) vrací vždy `false` — i staré cookie od testerů z kroku 2
tím okamžitě přestanou platit, žádná změna kódu ani redeploy navíc není potřeba.

---

## 10. Doména a nasazení

**Stav: hotovo.** `enviquiz.com` a `www.enviquiz.com` jsou živé a míří na appku. Nikde v kódu se
doména netvrdí napevno — všude, kde je potřeba absolutní URL (QR kódy, odkazy, generovaný tisk),
se čte `NEXT_PUBLIC_BASE_URL` (na VPS nastavená na `https://enviquiz.com`).

### Historie téhle sekce

Appka vznikla a první měsíc běžela na Vercelu + Neonu (§2), s `enviquiz.com` vybranou ale zatím
nezapojenou doménou. Po předání projektu kolegovi (30. 8.) se nasazení přesunulo na vlastní VPS —
rozhodnutí, ne chyba: odstraňuje to Neonovo uspávání computu při neaktivitě (studený start) a
network latenci k externí DB, když appka i databáze běží na stejném stroji. Původní
Vercel/Neon postup zůstává v §2 jako referenční alternativa.

### Aktuální nasazení

- **VPS**: `157.90.169.205`, kód v `/opt/enviquiz`, proces `enviquiz` pod **PM2**, poslouchá na
  portu `4600`, Node 22.
- **nginx** před appkou dělá TLS terminaci (Let's Encrypt, automatická obnova certifikátu) a
  reverse proxy na `127.0.0.1:4600`. Konfigurace nginx/certbotu žije jen na VPS, ne v repu.
- **Databáze**: samostatný PostgreSQL 16 na tom samém VPS, databáze `vinci_qr`, vlastní uživatel —
  `DATABASE_URL` v `/opt/enviquiz/.env` na to míří přes `localhost`, ne přes veřejnou síť.
- **Automatický deploy**: `.github/workflows/deploy.yml` — na každý push do `main` GitHub Actions
  udělá SSH na VPS a spustí `git fetch && git reset --hard origin/main && npm ci &&
  npx prisma migrate deploy && npm run build && pm2 restart enviquiz --update-env` (~40 s). Stav
  běhu je vidět u commitu na GitHubu a v záložce **Actions** repozitáře. SSH přístup
  (`SSH_HOST`/`SSH_USER`/`SSH_PRIVATE_KEY`) je v GitHub Actions secrets repozitáře, ne v kódu.
- **Migrace databáze při deployi jsou automatické** (`prisma migrate deploy` je krok ve workflow
  výše) — narozdíl od §2 (Vercel) tam není potřeba nic pouštět ručně.
- **Repozitář je od 30. 8. veřejný** (aby šel vidět stav Actions běhů komukoli s odkazem, bez
  nutnosti řešit přístupy). Ověřeno prohledáním celé git historie: **žádné skutečné secrets (DB
  connection stringy, hesla, tokeny, SSH klíče) v ní nikdy nebyly commitnuté** — jen příklady v
  `.env.example`, lokální Docker přihlašovací údaje (`vinci:vinci`, viz §1) a zjevně fiktivní
  hodnoty v testech (`lib/session.test.ts`). GitHub Actions secrets samotné nejsou součástí gitu a
  veřejností repa se nijak neodkryjí. Pokud i tak vadí mít kód veřejně čitelný, jde to vrátit na
  privátní — pak si ale někdo musí hlídat, kdo má do repa přístup, aby viděl stav Actions.
- **Starý Vercel projekt a Neon databáze pořád existují**, ale nic na ně neukazuje —
  `vinci-qr-soutez.vercel.app` odpovídá, ale je to teď osiřelá kopie appky proti staré (a od
  cca 2. 9. neaktivní) Neon databázi. Bezpečné vypnout, viz checklist v §0.

### Co se nezměnilo

- `COMPETITION_BYPASS_TOKEN` (§9) funguje stejně, jen teď skrz `enviquiz.com` — testovací odkaz je
  tvaru `https://enviquiz.com/api/bypass?token=<token>`, ověřeno naživo (registrace i odpovídání
  fungují navzdory časovému zámku).
- Časové okno soutěže (§9) appka naživo správně vyhodnocuje — do 14. 9. ukazuje „MOC BRZY!".
- **`ADMIN_URL_TOKEN`, `ADMIN_PASSWORD` i `COMPETITION_BYPASS_TOKEN` byly při přesunu vygenerované
  nové** — staré hodnoty z Vercel env (pokud je někdo měl uložené) na `enviquiz.com` **neplatí**.

---

## Otevřené body / vědomé kompromisy

1. ~~Doména (`enviquiz.com`) je vybraná, ale zatím nezapojená~~ — **hotovo od 30. 8.**, appka běží
   na `enviquiz.com` na vlastním VPS (§10). QR kódy (`npm run qr`) pořád generuj **až po** finálním
   obsahu otázek (bod 8 níže), doménu už měnit nebude potřeba.
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
8. **Nové jazyky (SK, RO, BG) — UI texty jsou strojově/AI přeložené**, ne od rodilého mluvčího
   (`messages/sk.json`, `messages/ro.json`, `messages/bg.json`). **Vzorové otázky 1–3** v `data/`
   měly reálné firemní texty (cs/hu/pl) už od začátku, ostatní jazyky u nich jsou AI překlad
   stejné otázky. **Vzorové otázky 4–20 jsou nově celé vymyšlené AI placeholder** (enviro
   kvízové fakty) ve všech 7 jazycích — nejsou od klienta ani od překladatele. **Před ostrým
   seedem nech UI texty i VŠECHNY otázky 1–20 zkontrolovat/nahradit skutečným obsahem a rodilý
   mluvčí ať zkontroluje SK/RO/BG.**
9. **`Question.number` a `correctOption` se needitují needitovatelně napříč jazyky** — pokud se
   při doplňování RO/BG/SK/EN překladů omylem prohodí pořadí odpovědí oproti českému vzoru,
   validátor to nepozná (kontroluje jen že pole nejsou prázdná, ne významovou shodu pořadí). Po
   doplnění nových jazyků udělej ruční kontrolu na pár náhodných otázkách.
10. **Appka schválně není PWA** — dřívější `public/site.webmanifest` a odkaz na něj v
    `app/layout.tsx` byly odstraněny, protože Chrome na mobilu díky nim nabízel „Přidat na plochu"
    (instalaci appky) — u interní krátkodobé soutěže je to zbytečné rozptýlení a možný zdroj
    problémů (zastaralá nainstalovaná verze v cache, matoucí ikonka na ploše po skončení akce).
    Favicon (`public/favicon.png`) a `theme-color` v `app/layout.tsx` zůstávají, ty install prompt
    nespouští. Pokud by PWA chování bylo v budoucnu žádoucí, manifest a link v `layout.tsx` stačí
    vrátit zpět — nic dalšího na to appka nepotřebuje.
11. **Produkční databáze nemá (zatím) automatické zálohování.** Neon (§2) měl branching a
    point-in-time-recovery zabudované; samostatný Postgres na VPS (§10) tohle sám od sebe nedělá.
    Než se appka spustí ostro se skutečnými registracemi, ověř na serveru pravidelný `pg_dump`
    (cron) nebo snapshoty na úrovni VPS providera — jinak je jediná záloha "doufat, že se nic
    nepokazí".
12. **GitHub repozitář je od 30. 8. veřejný** (§10) — vědomé rozhodnutí kvůli viditelnosti GitHub
    Actions bez řešení přístupů. Historie byla prohledaná, žádné reálné secrety v ní nejsou. Dá se
    to kdykoliv vrátit zpět na privátní, jen si pak přístup k repu (a tím k Actions logům) musí
    řešit každý zvlášť.
