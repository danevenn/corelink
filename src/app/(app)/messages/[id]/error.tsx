"use client";

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
      <button
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
        onClick={reset}
        type="button"
      >
        Reintentar
      </button>
    </div>
  );
}
