import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";

// §12 — tisková sestava, dostupná JEN ve vývoji.
export default async function PrintQrPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const slugsPath = path.join(process.cwd(), "data", "question-slugs.json");
  if (!fs.existsSync(slugsPath)) {
    return (
      <main className="p-8">
        <p className="text-vinci-red">
          Chybí <code>data/question-slugs.json</code>. Nejdřív spusť <code>npm run seed</code>.
        </p>
      </main>
    );
  }

  const slugMap: Record<string, string> = JSON.parse(fs.readFileSync(slugsPath, "utf-8"));
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const numbers = Object.keys(slugMap)
    .map(Number)
    .sort((a, b) => a - b);

  const posters = await Promise.all(
    numbers.map(async (number) => {
      const slug = slugMap[String(number)];
      const url = `${baseUrl}/q/${slug}`;
      const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: "H",
        margin: 4,
        width: 500,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      return { number, slug, url, dataUrl };
    })
  );

  return (
    <div>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          .poster { page-break-after: always; box-shadow: none !important; }
        }
        body { margin: 0; }
      `}</style>

      <p className="no-print bg-surface-muted p-4 text-sm text-text-muted">
        Vytiskni přes <strong>Ctrl/Cmd + P</strong> (nebo ulož jako PDF). {numbers.length} plakátků, base URL: {baseUrl}
      </p>

      {posters.map((p) => (
        <section
          key={p.number}
          className="poster flex flex-col items-center justify-between bg-white"
          style={{ width: "210mm", height: "297mm", padding: "18mm", boxSizing: "border-box" }}
        >
          <div className="text-center">
            <p className="font-serif text-2xl font-bold text-vinci-blue">VINCI Environment Day</p>
            <p className="mt-2 text-6xl font-black text-vinci-blue">Otázka {p.number}</p>
          </div>

          <div className="flex items-center gap-6">
            <span
              className="text-sm font-bold uppercase tracking-[0.3em] text-vinci-blue-dark"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Oskenuj mě
            </span>
            <div className="rounded-2xl border-8 bg-white p-6" style={{ borderColor: "#2DB194" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- data URI generovaný za běhu, next/image sem nepatří */}
              <img src={p.dataUrl} alt={`QR kód na otázku ${p.number}`} width={320} height={320} />
            </div>
          </div>

          <div className="text-center">
            <p className="text-xl font-semibold text-vinci-blue-ink">
              Naskenuj a odpověz / Olvasd be és válaszolj / Zeskanuj i odpowiedz
            </p>
            <p className="mt-4 font-serif text-lg font-bold text-vinci-blue">VINCI Energies</p>
          </div>
        </section>
      ))}
    </div>
  );
}
