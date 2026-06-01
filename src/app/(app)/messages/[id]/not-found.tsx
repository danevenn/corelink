import Link from "next/link";
import { MessageIcon } from "@/components/feed/icons";

// 404 de conversación: no existe o el viewer no es miembro (getConversationById
// devuelve null y autoriza por membresía).
export default function ConversationNotFound() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center"
      role="alert"
    >
      <span className="grid size-12 place-items-center rounded-full bg-surface-muted text-muted-foreground">
        <MessageIcon className="size-5" />
      </span>
      <p className="font-medium text-foreground">Conversación no disponible</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        No existe o no formas parte de ella.
      </p>
      <Link
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
        href="/messages"
      >
        Volver a Mensajes
      </Link>
    </div>
  );
}
