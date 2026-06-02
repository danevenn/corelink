import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/feed/empty-state";
import { BellIcon } from "@/components/feed/icons";
import { MarkAllReadButton } from "@/components/feed/mark-all-read-button";
import { FeedItem, MotionProvider } from "@/components/feed/motion";
import { NotificationItem } from "@/components/feed/notification-item";
import { getNotifications, getUnreadCount } from "@/server/notifications";
import { getViewer } from "@/server/viewer";

// Página de notificaciones (Server Component). Lista completa paginada por
// cursor (?cursor=), misma semántica de texto/enlaces que el desplegable.
// La campana de la cabecera marca todo como leído al abrirse; aquí ofrecemos
// el control explícito y mostramos el estado leído/no leído de cada fila.

export const metadata: Metadata = {
  title: "Notificaciones",
  description: "Tu actividad reciente en CoreLink.",
};

type SearchParams = Promise<{ cursor?: string }>;

const PAGE_SIZE = 20;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { cursor } = await searchParams;

  const viewer = await getViewer();
  if (!viewer) notFound();

  const [page, unread] = await Promise.all([
    getNotifications({ cursor, limit: PAGE_SIZE }),
    getUnreadCount(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground">
            Notificaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0
              ? `Tienes ${unread} sin leer.`
              : "Estás al día con todo."}
          </p>
        </div>
        <MarkAllReadButton hasUnread={unread > 0} />
      </header>

      {page.notifications.length === 0 ? (
        <EmptyState
          icon={<BellIcon className="size-6" />}
          title="Sin notificaciones"
          description="Cuando alguien reaccione, te siga o responda a tus publicaciones, lo verás aquí."
        />
      ) : (
        <MotionProvider>
          <ul className="flex flex-col gap-2">
            {page.notifications.map((n, i) => (
              <li key={n.id}>
                <FeedItem index={i}>
                  <NotificationItem notification={n} />
                </FeedItem>
              </li>
            ))}
          </ul>
        </MotionProvider>
      )}

      {page.nextCursor ? (
        <div className="flex justify-center pt-2">
          <Link
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
            href={`/notifications?cursor=${page.nextCursor}`}
          >
            Cargar más
          </Link>
        </div>
      ) : null}
    </div>
  );
}
