import type { HTMLAttributes } from "react";

/**
 * Bílá karta „plovoucí" nad fotkou, výrazné zaoblení (§9.3). `roundedCorner`
 * dovoluje signature detail z plakátu — jeden výrazně zaoblený levý horní
 * roh (~64px), ostatní běžné (24px). Použij na hlavní kartě otázky.
 */
export function Card({
  roundedCorner = false,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { roundedCorner?: boolean }) {
  return (
    <div
      className={`bg-surface shadow-sm border border-border ${
        roundedCorner ? "rounded-3xl rounded-tl-[64px]" : "rounded-3xl"
      } ${className}`}
      {...props}
    />
  );
}
