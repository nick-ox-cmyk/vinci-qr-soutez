"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistogramBucket, LanguageStat, QuestionStat, TimeBucket } from "@/lib/stats";
import { formatTime } from "@/lib/format";

// Barvy dle §9 — ne výchozí barvy Recharts.
const COLOR_BLUE = "#004289";
const COLOR_GREEN = "#95C11F";
const COLOR_TEAL = "#2DB194";
const COLOR_GRID = "#E3E8F0";

const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: "1px solid #E3E8F0", fontSize: 13 },
};

export function HistogramChart({ data }: { data: HistogramBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLOR_GRID} vertical={false} />
        <XAxis dataKey="score" tick={{ fontSize: 12 }} label={{ value: "Správných odpovědí", position: "insideBottom", offset: -2, fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} účastníků`, "Počet"]} labelFormatter={(l) => `${l} správně`} />
        <Bar dataKey="count" fill={COLOR_BLUE} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function QuestionSuccessChart({ data }: { data: QuestionStat[] }) {
  const [sorted, setSorted] = useState(true);
  const chartData = sorted ? [...data].sort((a, b) => a.successRate - b.successRate) : data;

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setSorted((s) => !s)}
          className="rounded-full border border-border px-3 py-1 text-xs font-medium text-vinci-blue-ink hover:bg-surface-muted"
        >
          {sorted ? "Řadit podle čísla otázky" : "Řadit podle úspěšnosti"}
        </button>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={COLOR_GRID} vertical={false} />
          <XAxis dataKey="number" tick={{ fontSize: 11 }} label={{ value: "Č. otázky", position: "insideBottom", offset: -2, fontSize: 12 }} />
          <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip
            {...tooltipStyle}
            formatter={(v: number) => [`${v.toFixed(0)} %`, "Úspěšnost"]}
            labelFormatter={(l) => `Otázka ${l}`}
          />
          <Bar dataKey="successRate" fill={COLOR_GREEN} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function QuestionVolumeChart({ data }: { data: QuestionStat[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLOR_GRID} vertical={false} />
        <XAxis dataKey="number" tick={{ fontSize: 11 }} label={{ value: "Č. otázky", position: "insideBottom", offset: -2, fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} odpovědí`, "Počet"]} labelFormatter={(l) => `Otázka ${l}`} />
        <Bar dataKey="answeredCount" fill={COLOR_TEAL} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const LANGUAGE_LABELS: Record<string, string> = { cs: "Čeština", hu: "Maďarština", pl: "Polština" };

export function LanguageChart({ data }: { data: LanguageStat[] }) {
  const chartData = data.map((d) => ({ ...d, label: LANGUAGE_LABELS[d.language] ?? d.language }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLOR_GRID} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
        <Tooltip {...tooltipStyle} />
        <Bar yAxisId="left" dataKey="participantCount" name="Účastníků" fill={COLOR_BLUE} radius={[4, 4, 0, 0]} />
        <Bar yAxisId="right" dataKey="avgSuccessRate" name="Úspěšnost %" fill={COLOR_GREEN} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TimeSeriesChart({ data }: { data: TimeBucket[] }) {
  const chartData = data.map((d) => ({
    time: formatTime(d.bucketStart),
    count: d.count,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLOR_GRID} vertical={false} />
        <XAxis dataKey="time" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} odpovědí`, "Počet"]} />
        <Line type="monotone" dataKey="count" stroke={COLOR_BLUE} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
