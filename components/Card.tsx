import type { HTMLAttributes } from "react";

/** Bílá karta, jednotné zaoblení na všech rozích napříč celou appkou. */
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-3xl border border-border bg-surface shadow-sm ${className}`} {...props} />;
}
