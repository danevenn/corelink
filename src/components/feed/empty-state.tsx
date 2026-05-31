// Estado vacío reutilizable (feed sin posts, canal sin actividad, hilo sin
// respuestas). Server Component presentacional.

import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  icon?: ReactNode;
};

export function EmptyState({ title, description, icon }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
      {icon ? (
        <span className="mb-1 grid size-12 place-items-center rounded-full bg-surface-muted text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <p className="font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
