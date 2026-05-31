import { REACTION_META, REACTION_ORDER } from "@/lib/feed-ui";
import type { ReactionBreakdown } from "@/server/posts";

type ReactionsProps = {
  breakdown: ReactionBreakdown;
  total: number;
};

/** Resumen de reacciones SOLO LECTURA. La acción de reaccionar llega en Fase 5. */
export function ReactionSummary({ breakdown, total }: ReactionsProps) {
  if (total === 0) {
    return (
      <span className="text-xs text-muted-foreground">Sin reacciones aún</span>
    );
  }

  const active = REACTION_ORDER.filter((type) => breakdown[type] > 0);

  return (
    <div className="flex items-center gap-2">
      <ul className="flex items-center gap-1.5" aria-label="Reacciones">
        {active.map((type) => {
          const meta = REACTION_META[type];
          return (
            <li
              key={type}
              className="flex items-center gap-1 rounded-full border border-border bg-surface-muted px-2 py-0.5 text-xs"
              title={`${meta.label}: ${breakdown[type]}`}
            >
              <span aria-hidden="true">{meta.emoji}</span>
              <span className="font-medium tabular-nums text-muted-foreground">
                {breakdown[type]}
              </span>
              <span className="sr-only">{meta.label}</span>
            </li>
          );
        })}
      </ul>
      <span className="text-xs text-muted-foreground tabular-nums">
        {total} {total === 1 ? "reacción" : "reacciones"}
      </span>
    </div>
  );
}
