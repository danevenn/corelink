import { notFound } from "next/navigation";
import { ConversationHeader } from "@/components/chat/conversation-header";
import { MessageThread } from "@/components/chat/message-thread";
import { MotionProvider } from "@/components/feed/motion";
import { getConversationById, getMessages } from "@/server/chat";
import { getViewer } from "@/server/viewer";

// Vista de una conversación: cabecera (server) + hilo en vivo (island).
// Carga el detalle (miembros con lastReadAt) y la primera página de historial en
// el servidor; el hilo se encarga del tiempo real, optimismo y paginación.
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const viewer = await getViewer();
  if (!viewer) notFound();

  const detail = await getConversationById(id);
  // null = no existe o el viewer no es miembro (la query ya autoriza).
  if (!detail) notFound();

  const page = await getMessages(id, { limit: 30 });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ConversationHeader detail={detail} viewerId={viewer.id} />
      <MotionProvider>
        <MessageThread
          conversationId={id}
          initialCursor={page.nextCursor}
          initialMembers={detail.members}
          initialMessages={page.messages}
          viewerId={viewer.id}
        />
      </MotionProvider>
    </div>
  );
}
