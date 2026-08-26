import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  // Zelené pozadí + TMAVÝ text (--vinci-blue-dark) — bílý text na zelené by
  // nesplňoval WCAG AA, viz §9.1.
  primary:
    "bg-wenow-green text-vinci-blue-dark hover:bg-wenow-green-dark disabled:bg-border disabled:text-text-muted",
  secondary: "bg-vinci-blue text-white hover:bg-vinci-blue-dark disabled:bg-border disabled:text-text-muted",
  ghost: "bg-transparent text-vinci-blue border border-border hover:bg-surface-muted",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex h-13 min-h-[52px] items-center justify-center rounded-xl px-6 font-semibold transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
