import type { CSSProperties, ReactNode } from "react";

export interface StatItem {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}

// Several figures on one glass surface, separated by hairlines. Used wherever a page
// summarises numbers, so they read as one group rather than a row of separate cards.
export function StatStrip({
  items,
  label,
  columns = 4,
  columnsSmall = 2,
  className = "",
}: {
  items: StatItem[];
  label: string;
  columns?: number; // from 64rem up
  columnsSmall?: number; // below 64rem
  className?: string;
}) {
  return (
    <section
      aria-label={label}
      className={`panel stat-strip ${className}`}
      style={{ "--stat-cols": columns, "--stat-cols-sm": columnsSmall } as CSSProperties}
    >
      {items.map((item) => (
        <div key={item.label}>
          <p className="flex items-start gap-1.5 text-sm leading-snug text-muted-foreground">
            <span aria-hidden="true" className="mt-0.5 shrink-0 [&>svg]:size-3.5">
              {item.icon}
            </span>
            <span className="min-w-0">{item.label}</span>
          </p>
          <p className="type-stat mt-1 truncate">{item.value}</p>
          {item.hint ? <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p> : null}
        </div>
      ))}
    </section>
  );
}
