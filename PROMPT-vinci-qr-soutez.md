# Prompt pro Claude Code — VINCI Environment Day: QR soutěž

> Zkopíruj celý tento dokument do Claude Code jako zadání. Je psaný jako specifikace, ne jako konverzace.

---

## 0. Role a cíl

Jsi senior full-stack vývojář. Postav produkční webovou aplikaci pro interní firemní QR soutěž
**VINCI Environment Day** pro VINCI Energies CZ.

Postupuj takto:
1. Nejdřív si projdi celou specifikaci a napiš stručný implementační plán (soubory, pořadí kroků).
2. Založ projekt, datový model a migrace.
3. Implementuj účastnickou část (registrace → otázka → uložení).
4. Implementuj výsledkovou/administrační stránku.
5. Implementuj seed skripty a generátor QR kódů.
6. Napiš testy a projeď je.
7. Na závěr napiš `README.md` s postupem nasazení a přípravy akce.

Pracuj v malých commitech, po každé fázi ověř, že build i testy procházejí.

---

## 1. Kontext a rozsah

- Interní soutěž pro zaměstnance VINCI Energies CZ během akce **VINCI Environment Day**.
- **~200 účastníků, jedna lokalita, jeden časový blok** (ale aplikace běží nepřetržitě, bez pevného časového okna).
- Účastníci jsou **předem v databázi** — nikdo se sám neregistruje "z ulice".
- Po prostorách firmy je rozvěšeno **30 QR kódů**, každý vede na jednu otázku.
- Na startu je **1 primární QR kód** vedoucí na registraci.
- Jazyky: **čeština (cs), maďarština (hu), polština (pl)**. Jazyk určuje záznam zaměstnance, účastník ho během soutěže nevybírá.
- Většina účastníků skenuje **mobilem** → mobile-first je závazné, ne "nice to have".

### Klíčová rozhodnutí (už odsouhlasená, neptej se na ně znovu)

| Téma | Rozhodnutí |
|---|---|
| Stack | Next.js 15 (App Router) + TypeScript + Postgres + Prisma, deploy na Vercel |
| Identifikace | Našeptávač **jméno + firma** (bez PIN/hesla) |
| Zpětná vazba po odpovědi | **Žádná.** Účastník nikdy nevidí, zda odpověděl správně |
| Co účastník vidí | Číslo otázky + počet zodpovězených otázek z celku (např. „12 / 30"). **Nikdy ne skóre.** |
| Admin CRUD | **Není.** Otázky i zaměstnanci se nahrávají z CSV při přípravě akce |
| Výsledky | Jedna skrytá stránka na náhodné URL + přihlášení heslem |
| Časové okno | Není. Soutěž běží pořád |
| Povinnost odpovědět | Žádná. Kdo QR kód nenajde, otázku prostě nemá zodpovězenou |
| Pořadí otázek | Volné, v libovolném pořadí |

---

## 2. Technický stack

```
Next.js 15 (App Router, React Server Components, Server Actions)
TypeScript (strict)
Tailwind CSS v4
Prisma ORM + PostgreSQL (Neon nebo Vercel Postgres)
jose (podepsané JWT v cookie)
Recharts (grafy ve výsledcích)
qrcode (generování QR)
Zod (validace vstupů)
Vitest (unit) + Playwright (e2e, mobilní viewport)
```

Deploy: **Vercel**. Doména zatím není vybraná — vše, co potřebuje absolutní URL, čti z
`NEXT_PUBLIC_BASE_URL`. Nikde nehardcoduj doménu.

### Environment proměnné

```bash
DATABASE_URL=            # Postgres connection string
SESSION_SECRET=          # min. 32 znaků, podpis účastnické cookie
ADMIN_URL_TOKEN=         # náhodný token ve výsledkové URL, např. 24 znaků
ADMIN_PASSWORD=          # heslo k výsledkové stránce
NEXT_PUBLIC_BASE_URL=    # https://... (bez lomítka na konci)
```

Přidej `.env.example` a skript `npm run gen:secrets`, který vypíše bezpečně vygenerované hodnoty
pro `SESSION_SECRET` a `ADMIN_URL_TOKEN`.

### 2.1 Architektura a mapa routes

Aplikace má **tři oddělené zóny** s odlišným způsobem přístupu:

| Zóna | Přístup | Routes |
|---|---|---|
| **Veřejná / registrační** | kdokoli s primárním QR | `/` |
| **Soutěžní** | podepsaná účastnická cookie | `/q/[slug]` |
| **Výsledková** | tajný token v URL + heslo | `/r/[token]`, `/r/[token]/u/[id]` |

```
app/
  layout.tsx                    # fonty, <html lang>, patička s logem
  page.tsx                      # registrace (RSC) + EmployeeSearch (klient)
  q/[slug]/page.tsx             # otázka — RSC, tři stavy (§6.1)
  r/[token]/page.tsx            # dashboard výsledků
  r/[token]/u/[id]/page.tsx     # detail účastníka
  r/[token]/login/page.tsx      # heslo
  print/qr/page.tsx             # tisková sestava QR (jen dev)
  api/employees/search/route.ts # jediný REST endpoint (našeptávač)
  actions/                      # server actions: registerParticipant, submitAnswer, adminLogin
lib/
  session.ts    # podpis/ověření cookie (jose)
  slug.ts       # generátor slugů
  scoring.ts    # výpočet pořadí + tie-break (čistá funkce, testovatelná)
  stats.ts      # agregace pro dashboard
  i18n.ts       # slovníky, fallback
  ratelimit.ts  # vyměnitelná abstrakce
  dto.ts        # mapování Prisma → klientské DTO (odstraňuje correctOption)
components/     # Button, AnswerCard, ProgressBar, EmployeeSearch, Card, StatTile, DataTable
data/           # employees.csv, questions.csv, question-slugs.json
scripts/        # seed.ts, validate.ts, qr.ts, purge.ts, gen-secrets.ts
messages/       # cs.json, hu.json, pl.json
```

Principy:
- **Server-first.** Stránky jsou React Server Components; klientský JS jen tam, kde je
  nutná interakce (našeptávač, výběr odpovědi, řazení tabulek, grafy).
- **Jediný REST endpoint** je našeptávač (potřebuje inkrementální dotazy). Všechny mutace
  jdou přes Server Actions.
- `lib/scoring.ts` a `lib/stats.ts` jsou **čisté funkce nad daty z DB** — díky tomu jdou
  testovat bez databáze a vyhodnocení soutěže je jednoznačně ověřitelné.
- `lib/dto.ts` je jediné místo, kde se z entity `Question` skládá objekt pro klienta.
  Tím je ochrana správné odpovědi na jednom místě, ne roztroušená po stránkách.

---

## 3. Datový model (Prisma schema)

```prisma
model Company {
  id        String     @id @default(cuid())
  name      String     @unique
  employees Employee[]
}

model Employee {
  id             String       @id @default(cuid())
  fullName       String
  // fullName bez diakritiky, lowercase — pro vyhledávání v našeptávači
  searchName     String
  language       Language
  companyId      String
  company        Company      @relation(fields: [companyId], references: [id])
  externalRef    String?      // volitelné osobní číslo z HR exportu
  participant    Participant?

  @@index([searchName])
  @@unique([fullName, companyId])
}

enum Language {
  cs
  hu
  pl
}

model Participant {
  id           String   @id @default(cuid())
  employeeId   String   @unique
  employee     Employee @relation(fields: [employeeId], references: [id])
  language     Language          // zkopírováno z Employee v okamžiku registrace
  registeredAt DateTime @default(now())
  lastSeenAt   DateTime @default(now())
  // kolikrát se identita znovu přihlásila na jiném zařízení / po ztrátě cookie
  reclaimCount Int      @default(0)
  answers      Answer[]
}

model Question {
  id            String                @id @default(cuid())
  number        Int                   @unique   // 1..30, tiskne se na plakát
  slug          String                @unique   // náhodný identifikátor v URL
  correctOption Int                             // 1 | 2 | 3
  active        Boolean               @default(true)
  translations  QuestionTranslation[]
  answers       Answer[]
}

model QuestionTranslation {
  id         String   @id @default(cuid())
  questionId String
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  language   Language
  text       String
  option1    String
  option2    String
  option3    String

  @@unique([questionId, language])
}

model Answer {
  id             String      @id @default(cuid())
  participantId  String
  participant    Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)
  questionId     String
  question       Question    @relation(fields: [questionId], references: [id])
  selectedOption Int         // 1 | 2 | 3
  isCorrect      Boolean     // spočítáno na serveru při zápisu
  answeredAt     DateTime    @default(now())

  // ⚠️ TOTO je hlavní ochrana proti opakovanému zodpovězení otázky
  @@unique([participantId, questionId])
  @@index([questionId])
}
```

### Poznámky k modelu

- `isCorrect` je **denormalizované schválně** — vyhodnocení 200 × 30 = 6 000 řádků pak jde
  jednoduchými agregacemi bez joinu na `correctOption`.
- `correctOption` **nikdy neopouští server.** Do klientských komponent posílej výhradně
  DTO bez tohoto pole. Napiš na to explicitní test.
- `Company` se zakládá automaticky z distinct hodnot v CSV zaměstnanců.

---

## 4. Bezpečné identifikátory otázek (URL)

URL otázky: **`/q/{slug}`**, například `/q/k7m2xq9f`.

Požadavky:
- `slug` = 9 znaků z abecedy `23456789abcdefghjkmnpqrstuvwxyz` (bez `0/o/1/l/i`, aby se dal
  v nouzi přepsat ručně). Prostor ≈ 31⁹ ≈ 2,6 × 10¹³ — enumerace je nepraktická.
- Generuj kryptograficky bezpečně (`crypto.randomBytes`, ne `Math.random`).
- Slug **nesmí mít žádný vztah k `number`** ani k pořadí v CSV. Přiřaď ho náhodnou permutací.
- Neexistující slug → obecná 404 stránka. **Nikdy** nerozlišuj „neexistuje" vs. „neaktivní"
  a nevracej různé časy odpovědi.
- Lehký rate limit na `/q/*` a na vyhledávací endpoint (viz §8).
- `robots.txt` zakazuje vše; na všech stránkách `<meta name="robots" content="noindex, nofollow">`.

### ⚠️ Stabilita slugů — kritické

QR kódy se **tisknou a věší na zeď**. Přegenerování slugů = nutnost přetisknout 30 plakátů.

- Při prvním seedu se slugy vygenerují a **uloží do `data/question-slugs.json`** ve tvaru
  `{ "1": "k7m2xq9f", "2": "...", ... }`.
- Každý další seed tento soubor načte a slugy **znovu použije**. Nové slugy generuje jen pro
  čísla otázek, která v souboru chybí.
- Přegenerování jen na explicitní `npm run seed -- --regenerate-slugs`, s velkým varováním
  v konzoli a potvrzením `y/N`.
- `data/question-slugs.json` commitni do repa.

---

## 5. Identifikace účastníka a session

### 5.1 Registrace

Primární QR kód míří na **`/`**.

Průběh:
1. `/` zobrazí uvítací obrazovku + pole „Najdi svoje jméno".
2. Uživatel píše → našeptávač volá `GET /api/employees/search?q=...`.
   - Minimálně **2 znaky**, debounce 250 ms, max. **8 výsledků**.
   - Vyhledávání **bez ohledu na diakritiku a velikost písmen** (sloupec `searchName`,
     normalizace přes `String.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()`).
   - Hledej i podle příjmení uprostřed řetězce (`contains`), ne jen prefixu.
   - Endpoint vrací **výhradně** `{ id, fullName, companyName }`. Nikdy jazyk, nikdy externalRef.
   - Bez query nebo pod 2 znaky vrací prázdné pole — **nikdy nevypisuj celý seznam zaměstnanců**.
3. Každý výsledek se zobrazí jako `Jan Novák` / `TPI Česká republika, s.r.o.` (firma menším písmem)
   — tím se rozliší shodná jména.
4. Po výběru se objeví **potvrzovací obrazovka**: jméno, firma a přiřazený jazyk
   („Tvůj jazyk: **Čeština**" / „A nyelved: **Magyar**" / „Twój język: **Polski**").
5. Tlačítko **Potvrdit a začít** → `POST` server action `registerParticipant(employeeId)`.
6. Server vytvoří (nebo najde existující) `Participant`, nastaví cookie, přesměruje.

### 5.2 Session cookie

```
Název:     ved_pid
Obsah:     podepsaný JWT (jose, HS256) { pid: participantId, iat }
Podpis:    SESSION_SECRET
Vlastnosti: HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=5184000 (60 dní)
```

- Cookie obsahuje **jen ID a podpis** — žádné jméno, žádné skóre.
- Při každém požadavku ověř podpis. Neplatná / prošlá cookie = žádná session.
- Cookie **záměrně přežije celou akci s velkou rezervou** — cílem je, aby k výpadku
  vůbec nedošlo.

### 5.3 Ztráta session (fallback)

Toto je nejdůležitější UX detail celé aplikace. Když uživatel naskenuje `/q/{slug}` **bez session**:

- **Neztrať sken.** Nepřesměrovávej na holou `/`.
- Zobraz přímo na stránce otázky blok „Nejdřív se představ" s **týmž našeptávačem** jako
  při registraci. Po výběru jména a potvrzení se **na místě** načte otázka v jeho jazyce.
- Alternativně přesměruj na `/?next=/q/{slug}` a po registraci vrať zpět — ale inline varianta
  je lepší, drž se jí.

Když je zaměstnanec už zaregistrovaný na jiném zařízení:
- **Povol převzetí** — vytvoř novou session pro stejného `Participant`, zvyš `reclaimCount`,
  aktualizuj `lastSeenAt`.
- **Dosavadní odpovědi zůstávají.** Registrace se neresetuje.
- Zobraz nenápadnou hlášku: „Vítej zpět, pokračuješ ve své soutěži."
- `reclaimCount` vypisuj ve výsledkové tabulce — vysoká hodnota může znamenat problém.

> **Vědomé riziko:** bez PIN/hesla může teoreticky kdokoli soutěžit pod cizím jménem.
> Pro interní akci je to přijatelné; `reclaimCount` slouží jako detekce. Pokud by se to mělo
> zpřísnit, přidal by se krátký kód z jmenovky — v této verzi ne.

---

## 6. Soutěžní část

### 6.1 Stránka otázky `/q/{slug}`

Server komponenta:
1. Načti session → `Participant`. Bez session → viz §5.3.
2. Najdi `Question` podle `slug`. Nenalezeno nebo `active === false` → 404.
3. Načti `QuestionTranslation` pro jazyk účastníka. **Fallback na `cs`**, pokud chybí
   (a zaloguj warning — všechny překlady by měly být kompletní).
4. Zjisti, zda už `Answer(participantId, questionId)` existuje.

**Stav A — ještě neodpovězeno:**
- Horní lišta: `Otázka 14` vlevo, `12 / 30` vpravo (tenký progress pruh pod tím).
- Text otázky, velké písmo, dobrá čitelnost na mobilu.
- Tři odpovědi jako **velké klikatelné karty** (min. výška 56 px, celá karta je tap target).
- Výběr = zvýraznění karty (zelený rámeček + odrážka). **Výběr sám o sobě neodesílá.**
- Tlačítko **„Odeslat odpověď"** dole, zakázané dokud není vybráno.
- Po kliknutí **potvrzovací krok** (bottom sheet / modal): „Odpověď už nepůjde změnit.
  Opravdu odeslat?" → `Zrušit` / `Odeslat`. Akce je nevratná, dvojí potvrzení je nutné.

**Stav B — už odpovězeno:**
- „Na tuto otázku už jsi odpověděl(a)."
- Zobraz jeho zvolenou odpověď (zvýrazněnou, neklikatelnou).
- **Nezobrazuj, jestli byla správná.** Nezobrazuj správnou odpověď.
- Progress + „Hledej další QR kód."

**Stav C — právě uloženo:**
- Zelená ikona ✓ + „Odpověď uložena."
- Aktualizovaný progress: „Máš zodpovězeno **13 z 30** otázek."
- „Pokračuj v hledání dalšího QR kódu."
- Žádné skóre, žádná zpětná vazba o správnosti.

### 6.2 Zápis odpovědi (Server Action)

```ts
'use server'
async function submitAnswer(slug: string, selectedOption: number)
```

Postup na serveru — **veškerá validace jen zde, klientu nevěř nic**:

1. Ověř session → `participantId`. Chybí → chyba `NO_SESSION`.
2. Zod validace: `selectedOption ∈ {1, 2, 3}`.
3. Najdi otázku podle `slug`, ověř `active`.
4. `isCorrect = (selectedOption === question.correctOption)` — **výhradně na serveru**.
5. Zápis:
   ```ts
   await prisma.answer.create({ data: {...} })
   // odchyť Prisma P2002 (unique constraint) → vrať ALREADY_ANSWERED
   ```
   Spoléhej na **databázový unique constraint**, ne na předchozí `SELECT`.
   Kontrola typu „nejdřív se podívám, pak zapíšu" je závodní podmínka — dvojklik nebo dvě
   záložky by ji obešly.
6. `revalidatePath('/q/' + slug)`, aktualizuj `participant.lastSeenAt`.
7. Vrať pouze `{ status: 'saved' | 'already_answered', answeredCount, totalQuestions }`.
   **Nikdy nevracej `isCorrect` ani `correctOption`.**

Přidej idempotenci i na klientu: tlačítko se po odeslání okamžitě zablokuje a zobrazí spinner.

---

## 7. Výsledky a vyhodnocení

### 7.1 Přístup

URL: **`/r/{ADMIN_URL_TOKEN}`** — token se porovnává s env proměnnou v konstantním čase
(`crypto.timingSafeEqual`). Nesouhlasí → 404 (ne 403).

Za tokenem **přihlašovací formulář s heslem** (`ADMIN_PASSWORD`, porovnání také
timing-safe). Úspěch → podepsaná cookie `ved_admin` (HttpOnly, Secure, SameSite=Strict,
Max-Age 8 h). Rate limit: max 5 pokusů / 10 minut / IP.

Rozhraní výsledků je **v češtině**.

### 7.2 Přehledový dashboard

**KPI dlaždice:**
- Celkový počet zaregistrovaných účastníků
- Počet účastníků s alespoň 1 odpovědí
- Počet účastníků, kteří zodpověděli všech 30 („dokončené soutěže")
- Celkový počet odpovědí
- Průměrný počet správných odpovědí na účastníka
- Celková úspěšnost (% správných ze všech odpovědí)

**Karta vítěze:** jméno, firma, počet správných odpovědí, čas poslední odpovědi.

**Pořadí firem** — tabulka: firma | počet účastníků | zodpovězeno | správně | **úspěšnost %**.
Seřaď primárně podle počtu správných odpovědí (dle zadání), ale **zobraz i procenta** —
absolutní počet zvýhodňuje velké firmy a bez procent je to zavádějící. Nad tabulkou to
krátkou poznámkou vysvětli.

**Celkové pořadí účastníků** — tabulka, řaditelná a s vyhledáváním:
`pořadí | jméno | firma | jazyk | zodpovězeno | správně | chybně | úspěšnost % | poslední odpověď | reclaimCount`

**Pravidlo pořadí (tie-break), implementuj přesně takto:**
1. Více správných odpovědí
2. Při shodě: **dřívější čas poslední odpovědi** (kdo dosáhl skóre dřív)
3. Při shodě: dřívější registrace

**Statistika otázek** — tabulka: `č. | text (cs, zkrácený) | odpovědí | správně | úspěšnost % | rozložení 1/2/3`
s malým sloupcovým vizuálem rozložení voleb.

### 7.3 Grafy (Recharts)

1. **Histogram výsledků** — rozložení počtu správných odpovědí (osa X 0–30, osa Y počet účastníků)
2. **Úspěšnost jednotlivých otázek** — sloupcový graf, otázky 1–30, řaditelný podle úspěšnosti
   (hned uvidíš, které otázky byly moc těžké nebo špatně přeložené)
3. **Počet odpovědí podle otázky** — sloupcový graf (odhalí QR kód, který nikdo nenašel)
4. **Výsledky podle jazyka** — počet účastníků a průměrná úspěšnost pro cs / hu / pl
5. **Odpovědi v čase** — spojnicový graf po 15 minutách (průběh akce)

Barvy grafů podle palety v §9. Ne výchozí barvy Recharts.

### 7.4 Detail účastníka

`/r/{token}/u/{participantId}` — jméno, firma, jazyk, časy, souhrn a tabulka všech 30 otázek:
`č. | otázka | jeho odpověď | správná odpověď | ✓/✗ | čas`. Nezodpovězené otázky zobraz šedě.

### 7.5 Exporty

Tlačítka pro stažení:
- `vysledky-poradi.csv` — celé pořadí
- `vysledky-odpovedi.csv` — všechny odpovědi (participant, otázka, volba, správně, čas)
- `vysledky-otazky.csv` — statistika otázek

CSV s BOM (`﻿`) a středníkem jako oddělovačem, aby se korektně otevřelo v českém Excelu.

---

## 8. Bezpečnost, výkon, ochrana dat

- **Správná odpověď nikdy neopustí server.** Explicitní DTO vrstva + test, který prohledá
  serializovaný payload stránky otázky na `correctOption`.
- **Unique constraint** `(participantId, questionId)` je jediná spolehlivá ochrana proti
  dvojité odpovědi — vždy skrz `create` + odchycení `P2002`.
- Všechny mutace přes **Server Actions** (Next.js posílá CSRF ochranu s nimi).
- Rate limiting (jednoduchý in-memory sliding window stačí na 200 lidí; strukturuj kód tak,
  aby šel vyměnit za Upstash Redis):
  - `/api/employees/search`: 30 req / min / IP
  - `submitAnswer`: 20 req / min / session
  - přihlášení do výsledků: 5 / 10 min / IP
- **Žádné logování jmen** do produkčních logů. Loguj `participantId`, ne `fullName`.
- Bezpečnostní hlavičky přes `next.config.ts`: `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, rozumná CSP.
- **GDPR:** na registrační stránce krátká věta (ve všech 3 jazycích):
  „Tvoje jméno a odpovědi zpracováváme pouze pro vyhodnocení této soutěže a smažeme je
  do 30 dnů po vyhlášení výsledků."
  Přidej `npm run purge` — smaže `Answer` a `Participant`, `Employee` nechá.
- Databázové indexy: `Employee.searchName`, `Answer.questionId`, `Answer.participantId`.
  Agregace pro dashboard piš jako jeden `groupBy` dotaz, ne N+1.

---

## 9. Design system — vizuální styl VINCI Energies

Vizuální styl je odvozený z dodaných materiálů (diplom a plakát „VINCI Environment Day"
s brandem **WeNow — The environment needs all of us**).

### 9.1 Barvy

```css
/* Značka */
--vinci-blue:        #004289;  /* primární — nadpisy, texty, logo */
--vinci-blue-dark:   #002B5C;  /* tmavý text na světlém, hover */
--vinci-blue-ink:    #14213D;  /* běžný text */
--vinci-red:         #E2001A;  /* pouze logo + chybové stavy */

/* WeNow / Environment Day */
--wenow-green:       #95C11F;  /* akční barva — CTA, progress, akcenty */
--wenow-green-dark:  #7BA318;  /* hover / active */
--wenow-green-soft:  #EEF6DA;  /* světlé pozadí bloků */
--eco-teal:          #2DB194;  /* sekundární akcent (rámeček QR na plakátu) */

/* Neutrály */
--surface:           #FFFFFF;
--surface-muted:     #F5F7FA;
--border:            #E3E8F0;
--text-muted:        #6B7A90;
```

**⚠️ Kontrast — dodrž:**
`--wenow-green` má vůči bílé kontrast jen ~2,1 : 1. Bílý text na zeleném tlačítku je
nečitelný a nesplňuje WCAG. **Na zeleném pozadí používej výhradně tmavý text
`--vinci-blue-dark`** (kontrast 6,6 : 1). Bílý text jen na `--vinci-blue` (9,9 : 1).

Cílem je WCAG **AA** u veškerého textu.

### 9.2 Typografie

Originální firemní řezy jsou **VinciSans** (Regular / Medium / Bold / Black) a
**VinciSerif Bold** — jsou licencované a v repu je nemáme.

- Připrav `app/fonts.ts` tak, aby šlo VinciSans/VinciSerif **doplnit jako lokální webfonty**
  (`next/font/local`), pokud je klient dodá — bez dalších zásahů do kódu.
- Do té doby použij nejbližší volně dostupné náhrady z Google Fonts:
  - **Source Sans 3** → náhrada VinciSans (UI, tlačítka, tabulky, texty otázek)
  - **Source Serif 4** → náhrada VinciSerif (jen nadpis „VINCI Environment Day")
- Font stack pro cs/hu/pl musí obsahovat plnou latinku s diakritikou (`ě š č ř ž ő ű ą ę ł ń ś ź ż`).
  Ověř, že načítáš `latin-ext` subset.
- Velikosti: základní text 17 px, text otázky 20–22 px, nadpisy 28–34 px.
  **Inputy minimálně 16 px** — jinak iOS Safari při focusu přiblíží stránku.

### 9.3 Vizuální jazyk (z plakátu a diplomu)

- **Fotografický pás nahoře** — příroda / větrné elektrárny, přes celou šířku, jako hlavní
  vizuál registrační stránky. Připrav `public/hero.jpg` jako placeholder + poznámku
  v README, že jde o oficiální fotku z materiálů VINCI.
- **Bílá karta „plovoucí" nad fotkou** — obsah v bílé kartě s výrazným zaoblením
  (`border-radius: 24px`) a jemným stínem. Přesně jak vypadá diplom.
- **Signature detail z plakátu:** karta s QR kódem má **jeden výrazně zaoblený roh**
  (levý horní, ~64 px) a ostatní běžné. Použij tuto asymetrii u hlavní karty otázky —
  je to nejvýraznější prvek celého vizuálu.
- **WeNow zelený kruhový odznak** — dekorativní zelený kruh s logem WeNow, přesahující
  přes okraj fotky. Vlož jako `public/wenow-badge.svg` (placeholder), na mobilu menší.
- **Logo VINCI Energies vpravo dole** na bílém podkladu, na každé stránce v patičce.
  `public/vinci-energies-logo.svg`.
- Hodně bílého prostoru, modrý text na bílé, zelená jen jako akční / zvýrazňovací barva.

### 9.4 Komponenty

- `Button` — varianty `primary` (zelené pozadí + `--vinci-blue-dark` text),
  `secondary` (modré pozadí + bílý text), `ghost`. Výška 52 px, `border-radius: 12px`.
- `AnswerCard` — velká volitelná karta. Klid: bílá + `--border`.
  Vybraná: `--wenow-green-soft` pozadí + 2px `--wenow-green` rámeček + ✓ vpravo.
  **Nepoužívej jen barvu jako nositele informace** — vždy přidej i ikonu (barvoslepost).
- `ProgressBar` — tenký (6 px), zelená výplň na `--border` podkladu.
- `EmployeeSearch` — input + rozbalovací seznam, stavy: prázdný / načítá se / nenalezeno /
  výsledky. Plná klávesová ovladatelnost (↑ ↓ Enter Esc), `role="combobox"` + ARIA.
- `Card`, `StatTile`, `DataTable` (řaditelná, vyhledávatelná, sticky hlavička).

### 9.5 Mobile-first — závazné

- Vše navrhuj **nejdřív pro 360 × 640 px**, desktop je až rozšíření.
- Primární tlačítko je **ukotvené u spodního okraje** (`position: sticky; bottom: 0`)
  s bezpečnou zónou (`env(safe-area-inset-bottom)`) — palcem dosažitelné.
- Minimální tap target **48 × 48 px**, mezery mezi kartami odpovědí min. 12 px
  (aby se u nevratné akce nedalo špatně kliknout).
- Použij `100dvh`, ne `100vh` (adresní řádek mobilních prohlížečů).
- **Žádný horizontální scroll na žádné stránce.** Tabulky ve výsledcích zabal do
  `overflow-x: auto` kontejneru.
- Optimalizuj pro pomalou firemní síť: server komponenty, minimum client JS,
  `next/image` s `priority` na hero, obrázky do 150 kB.
- `<meta name="theme-color" content="#004289">`, apple-touch-icon, jednoduchý webmanifest.

### ⚠️ In-app prohlížeče QR čteček

Řada QR čteček otevírá odkazy ve vestavěném webview, které **nemusí zachovat cookies**
mezi skeny. Proto:
- Fallback při ztrátě session (§5.3) musí být dokonalý — je to skutečná provozní pojistka.
- Na potvrzovací obrazovku po registraci přidej nenápadnou nápovědu:
  „Tip: otevři si stránku v běžném prohlížeči (Chrome / Safari), aby ti soutěž nezmizela."
- Do README napiš doporučení: na plakátu k primárnímu QR kódu uvést i **krátkou textovou URL**,
  aby si ji lidé mohli otevřít ručně.

---

## 10. Vícejazyčnost

- Slovníky UI: `messages/cs.json`, `messages/hu.json`, `messages/pl.json`.
  Struktura klíčů shodná, přidej test, který ověří, že mají identickou sadu klíčů.
- Jazyk otázek a UI **plyne z `Participant.language`**, ne z URL ani z volby uživatele.
- **Registrační stránka je výjimka** — v tu chvíli ještě jazyk neznáme:
  - přepínač `CS | HU | PL` nahoře, výchozí **CS**,
  - po výběru jména se stránka **automaticky přepne** na jazyk zaměstnance a potvrzovací
    obrazovka je už jen v jeho jazyce.
- `<html lang="...">` nastavuj podle aktivního jazyka.
- Fallback při chybějícím překladu otázky: `cs` + `console.warn` na serveru.
- Datum a čas formátuj přes `Intl.DateTimeFormat` s odpovídajícím locale.

---

## 11. Příprava dat — CSV seed

Žádný admin na správu obsahu není. Vše se plní ze dvou CSV souborů ve složce `data/`.

### 11.1 `data/employees.csv`

```csv
full_name;language;company;external_ref
Jan Novák;cs;TPI Česká republika, s.r.o.;
Anna Kovácsová;hu;VINCI Energies CZ;12345
Piotr Nowak;pl;Actemium CZ;
```

- Oddělovač `;`, kódování UTF-8 (s BOM i bez), aby se dal editovat v Excelu.
- `language` ∈ `cs | hu | pl`. `external_ref` volitelné.
- Firmy se zakládají z distinct hodnot `company` (trim + kolaps mezer).
- `search_name` se dopočítá automaticky.

### 11.2 `data/questions.csv`

Široký formát, 30 řádků:

```csv
number;correct_option;text_cs;opt1_cs;opt2_cs;opt3_cs;text_hu;opt1_hu;opt2_hu;opt3_hu;text_pl;opt1_pl;opt2_pl;opt3_pl
1;2;Kolik litrů vody...;10 l;50 l;200 l;Hány liter víz...;10 l;50 l;200 l;Ile litrów wody...;10 l;50 l;200 l
```

- `correct_option` ∈ `1 | 2 | 3` a je **stejná pro všechny jazyky** (překlady musí zachovat pořadí voleb).

### 11.3 `npm run seed`

Skript musí:
1. Načíst obě CSV, **validovat před jakýmkoli zápisem** (Zod). Při chybě vypsat
   **číslo řádku a konkrétní problém** a skončit bez změny databáze.
2. Kontrolovat: unikátnost `number`, `correct_option` ∈ {1,2,3}, přítomnost všech tří
   jazykových mutací, žádné prázdné texty, platný `language`, duplicity jmen v rámci firmy.
3. Načíst / doplnit slugy z `data/question-slugs.json` (viz §4).
4. Zapsat **idempotentně** (`upsert` podle `number` resp. `(fullName, companyId)`) —
   opakované spuštění nesmí nic rozbít ani smazat odpovědi.
5. Vypsat souhrn: `X firem, Y zaměstnanců (cs: a, hu: b, pl: c), 30 otázek, 90 překladů`.

Přidej `npm run validate` — jen validace CSV bez zápisu. To budeš pouštět nejčastěji.

### 11.4 Podpora XLSX (překladatelský sešit)

Obsah otázek se sbírá v Excelu (`VINCI-Environment-Day-otazky.xlsx`, listy `OTÁZKY`
a `ZAMĚSTNANCI`), protože 14sloupcové CSV se překladatelům posílá špatně.

Aby odpadl ruční export, **`npm run seed` i `npm run validate` musí přijmout i `.xlsx`**:

- pokud v `data/` leží `*.xlsx`, načti ho knihovnou `xlsx` (SheetJS);
- list `OTÁZKY`: řádek 1 = skupinový pruh, **řádek 2 = hlavička, data od řádku 3**;
  sloupce v pořadí `Č. | SPRÁVNÁ ODPOVĚĎ | text/opt1–3 CS | HU | PL`;
- list `ZAMĚSTNANCI`: hlavička v řádku 1, data od řádku 2,
  sloupce `Jméno a příjmení | Jazyk | Firma | Osobní číslo`;
- **řádky s prázdným textem otázky přeskoč** (sešit má předvyplněnou kostru 1–30);
- ve vzorovém sešitu jsou první 3 řádky obou listů ukázkové — v README uveď,
  že se před ostrým seedem přepisují skutečným obsahem;
- CSV zůstává podporované jako druhá cesta; validace i chybové hlášky jsou pro oba formáty stejné
  (u XLSX hlas číslo řádku tak, jak ho vidí uživatel v Excelu).

---

## 12. Generování QR kódů

`npm run qr` vytvoří ve složce `out/qr/`:

- `registrace.png` — primární QR na `NEXT_PUBLIC_BASE_URL`
- `q-01.png` … `q-30.png` — QR na `{BASE_URL}/q/{slug}`
- `qr-prehled.csv` — `číslo;slug;url` (kontrolní seznam pro tisk a pro dohledání
  „který QR kód visí kde")

Parametry QR (nepodceň, plakáty visí na zdi):
- **Úroveň korekce chyb `H` (30 %)** — poškozený nebo částečně zakrytý kód se pořád načte
- Klidová zóna 4 moduly, čistě černá na bílé (žádné barevné kódy, žádné gradienty)
- Export v takovém rozlišení, aby vytištěná hrana měla **min. 4 cm** (spolehlivý sken z ~30 cm)

**Tisková sestava:** vytvoř stránku `/print/qr` (dostupnou pouze v dev režimu, tzn.
`if (process.env.NODE_ENV === 'production') notFound()`), která vysází všech 30 plakátků
ve vizuálním stylu VINCI:
- jeden plakátek na stránku A4, `@media print` styly, `page-break-after: always`
- velké číslo otázky, QR kód v bílé kartě se zeleným rámečkem (jako na dodaném plakátu),
  svislý text „**OSKENUJ MĚ**", výzva ve všech třech jazycích
  („Naskenuj a odpověz / Olvasd be és válaszolj / Zeskanuj i odpowiedz"), logo VINCI Energies
- Dan si stránku otevře a vytiskne do PDF přes prohlížeč — je to jednodušší a hezčí
  než generovat PDF v kódu

---

## 13. Testy

**Vitest (unit / integrační):**
- `submitAnswer` uloží odpověď a správně vyhodnotí `isCorrect`
- **druhé odeslání téže otázky týmž účastníkem vrátí `already_answered` a nezmění DB**
- souběžná dvojitá odeslání (`Promise.all`) → v DB vznikne právě jeden `Answer`
- `correctOption` se **neobjeví** v datech vrácených stránkou otázky (prohledej serializovaný payload)
- slug generátor: unikátnost na 10 000 vzorcích, správná abeceda, žádná vazba na `number`
- řazení žebříčku včetně obou tie-breaků
- vyhledávání zaměstnanců ignoruje diakritiku (`novak` najde `Nováková`)
- slugy zůstanou po opakovaném seedu stejné
- slovníky cs/hu/pl mají identickou sadu klíčů

**Playwright (e2e, viewport iPhone 12):**
- kompletní průchod: registrace → otázka → odeslání → uložený stav → progress `1 / 30`
- návrat na tutéž otázku → stav „už zodpovězeno", nelze odeslat znovu
- otázka bez cookie → inline identifikace → otázka se načte ve správném jazyce
- maďarský zaměstnanec vidí maďarský text otázky
- výsledková stránka: špatný token → 404; správný token + špatné heslo → chyba; správné → dashboard

---

## 14. README.md — co musí obsahovat

1. Lokální spuštění (`.env`, `prisma migrate dev`, `npm run seed`, `npm run dev`)
2. Nasazení na Vercel + Neon, nastavení env proměnných, doména
3. **Postup přípravy akce** jako číslovaný checklist:
   1. Vyplnit `data/employees.csv` a `data/questions.csv`
   2. `npm run validate`
   3. `npm run seed`
   4. `npm run qr`, otevřít `/print/qr`, vytisknout
   5. Vylepit QR kódy, `qr-prehled.csv` použít jako soupis
   6. Otestovat 2–3 kódy skutečným telefonem **před akcí**
4. Kde najít výsledky (URL s tokenem, heslo) a jak je exportovat
5. `npm run purge` — smazání osobních dat po akci
6. Sekce **„Co se stane, když…"**: vybitý telefon, ztracená session, QR kód nikdo nenajde,
   zaměstnanec chybí v seznamu

---

## 15. Otevřené body / vědomé kompromisy

Zapiš je na konec README, aby se na ně nezapomnělo:

1. **Doména není vybraná** — vše přes `NEXT_PUBLIC_BASE_URL`. QR kódy se generují až po
   nasazení na finální doménu. **QR kódy nelze vytisknout dřív, než je doména známá.**
2. **Bez PIN se dá soutěžit pod cizím jménem** — detekce přes `reclaimCount`.
3. **Zaměstnanec chybí v CSV** → nezaregistruje se. Registrační stránka proto musí ukázat
   srozumitelnou hlášku „Nenašel jsi svoje jméno? Ozvi se organizátorovi." (ve všech 3 jazycích).
4. **Fonty VinciSans / VinciSerif** — nahrazené Source Sans 3 / Source Serif 4, dokud klient
   nedodá licencované soubory.
5. **Fotky a logo** — v repu jsou placeholdery, před ostrým nasazením je nutné vyměnit
   za oficiální assety z brand manuálu VINCI Energies.
6. **Přesné odstíny barev** jsou odečtené z dodaných PDF (diplom + plakát), ne z oficiálního
   brand manuálu — před spuštěním ideálně ověřit.

---

## 16. Kritéria hotovosti

- [ ] `npm run build` projde bez chyb a bez TypeScript warningů
- [ ] Všechny testy (Vitest i Playwright) procházejí
- [ ] Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95
- [ ] Ověřeno, že `correctOption` není nikde v klientském payloadu
- [ ] Dvojité odeslání odpovědi je prokazatelně nemožné (test + ruční ověření)
- [ ] Aplikace funguje na reálném telefonu přes reálný QR sken
- [ ] Žádný horizontální scroll na 360 px šířce
- [ ] README obsahuje kompletní checklist přípravy akce
