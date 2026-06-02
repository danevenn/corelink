"use client";

// Carcasa de dos paneles para /messages (cliente solo por el responsive móvil).
//
// Desktop (md+): lista (izq, ancho fijo) | conversación (der). Ambos visibles.
// Móvil: una sola columna. En el índice se ve la LISTA; al abrir una conversación
// (`/messages/[id]`) se ve la CONVERSACIÓN a pantalla completa. El propio panel
// de conversación incluye un botón "volver" para regresar a la lista.

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  list: ReactNode;
  children: ReactNode;
};

export function MessagesShell({ list, children }: Props) {
  const pathname = usePathname();
  // ¿Hay una conversación abierta? (/messages/<id>, no el índice).
  const conversationOpen = /^\/messages\/.+/.test(pathname);

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] overflow-hidden rounded-3xl border border-border bg-surface shadow-soft">
      <aside
        aria-label="Conversaciones"
        className={cn(
          "w-full shrink-0 flex-col border-border md:flex md:w-80 md:border-r",
          conversationOpen ? "hidden md:flex" : "flex",
        )}
      >
        {list}
      </aside>

      <section
        aria-label="Conversación"
        className={cn(
          "min-w-0 flex-1 flex-col",
          conversationOpen ? "flex" : "hidden md:flex",
        )}
      >
        {children}
      </section>
    </div>
  );
}
