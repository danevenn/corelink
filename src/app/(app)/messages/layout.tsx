import { Suspense } from "react";
import { ConversationList } from "@/components/chat/conversation-list";
import { MessagesShell } from "@/components/chat/messages-shell";
import { NewConversationMenu } from "@/components/chat/new-conversation-menu";
import { getConversations } from "@/server/chat";
import { getViewer } from "@/server/viewer";

// Layout de la sección Mensajes: panel de lista (server) + panel de conversación
// (children). La lista es un island que se actualiza en vivo por SSE; el layout
// persiste entre navegaciones a /messages/[id], por lo que la lista NO se
// desmonta al abrir una conversación (mantiene su estado y suscripciones).

export default async function MessagesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [conversations, viewer] = await Promise.all([
    getConversations(),
    getViewer(),
  ]);

  const list = (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-base font-semibold text-foreground">Mensajes</h1>
        <NewConversationMenu />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <Suspense>
          <ConversationList
            initial={conversations}
            viewerId={viewer?.id ?? ""}
          />
        </Suspense>
      </div>
    </>
  );

  return <MessagesShell list={list}>{children}</MessagesShell>;
}
