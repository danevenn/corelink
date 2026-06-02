"use client";

import { Button } from "@/components/ui/button";

// Límite de error de una conversación. Permite reintentar sin recargar la app.
export default function ConversationError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center"
      role="alert"
    >
      <p className="font-medium text-foreground">
        No hemos podido cargar la conversación
      </p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Algo ha fallado al recuperar los mensajes. Inténtalo de nuevo.
      </p>
      <Button onClick={reset} type="button">
        Reintentar
      </Button>
    </div>
  );
}
