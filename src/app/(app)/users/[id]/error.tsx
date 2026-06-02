"use client";

import { Button } from "@/components/ui/button";

// Límite de error de la página de perfil. Permite reintentar sin recargar todo.

export default function UserProfileError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-surface px-6 py-12 text-center shadow-soft"
      role="alert"
    >
      <p className="font-medium text-foreground">
        No hemos podido cargar el perfil
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Algo ha fallado al recuperar este perfil. Inténtalo de nuevo.
      </p>
      <Button onClick={reset} type="button">
        Reintentar
      </Button>
    </div>
  );
}
