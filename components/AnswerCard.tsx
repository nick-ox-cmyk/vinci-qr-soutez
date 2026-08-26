"use client";

type Props = {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onSelect?: () => void;
};

/**
 * Velká klikatelná karta odpovědi (§6.1, §9.4). Min. výška 56px, celá karta
 * je tap target. Barva NENÍ jediný nositel informace o výběru — vždy je
 * i ✓ ikona vpravo (kvůli barvosleposti).
 */
export function AnswerCard({ label, selected, disabled = false, onSelect }: Props) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`flex w-full min-h-14 items-center justify-between gap-3 rounded-2xl border-2 px-5 py-4 text-left text-lg transition-colors ${
        selected
          ? "border-wenow-green bg-wenow-green-soft text-vinci-blue-dark"
          : "border-border bg-surface text-vinci-blue-ink"
      } ${disabled ? "cursor-not-allowed" : "cursor-pointer active:scale-[0.99]"}`}
    >
      <span>{label}</span>
      {selected && (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
          <circle cx="12" cy="12" r="12" fill="var(--wenow-green)" />
          <path d="M7 12.5l3 3 7-7" stroke="var(--vinci-blue-dark)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
