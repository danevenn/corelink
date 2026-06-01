import { MessageIcon } from "@/components/feed/icons";

// Índice de Mensajes (panel derecho vacío en desktop). En móvil este panel está
// oculto: se ve la lista a pantalla completa (lo gestiona MessagesShell).
export default function MessagesIndexPage() {
  return (
    <div className="hidden h-full flex-col items-center justify-center gap-3 p-8 text-center md:flex">
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand"
      >
        <MessageIcon className="size-7" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">Tus mensajes</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Elige una conversación de la lista o empieza una nueva para comenzar a
          chatear.
        </p>
      </div>
    </div>
  );
}
