export function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-sm text-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold text-vinci-blue">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-text-muted">{hint}</div>}
    </div>
  );
}
