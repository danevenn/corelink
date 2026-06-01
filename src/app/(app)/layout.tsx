import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EventStreamProvider } from "@/components/events/event-stream-provider";
import { AppShell } from "@/components/feed/app-shell";
import { ChannelNav } from "@/components/feed/channel-nav";
import { NotificationBell } from "@/components/feed/notification-bell";
import { UserMenu } from "@/components/feed/user-menu";
import { auth } from "@/lib/auth";
import { getUnreadCount } from "@/server/notifications";
import { getChannels } from "@/server/posts";
import { getViewer } from "@/server/viewer";

// Layout del grupo autenticado. Defensa en profundidad: además del middleware,
// el servidor revalida la sesión aquí antes de renderizar cualquier ruta protegida.
// Aquí vive la carcasa común del feed: cabecera + barra lateral de canales.
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const viewer = await getViewer();
  if (!viewer) {
    redirect("/login");
  }

  const unread = await getUnreadCount();

  return (
    // Una sola EventSource para toda la zona autenticada: la campana la consume
    // hoy; el chat de la Fase 8 reutilizará la MISMA conexión sin duplicarla.
    <EventStreamProvider>
      <AppShell
        notifications={<NotificationBell initialUnread={unread} />}
        sidebar={
          <Suspense fallback={<SidebarSkeleton />}>
            <ChannelList />
          </Suspense>
        }
        user={
          <UserMenu
            avatarUrl={viewer.avatarUrl}
            displayName={viewer.displayName}
            email={viewer.email}
            id={viewer.id}
            isAnonymous={viewer.isAnonymous}
          />
        }
      >
        {children}
      </AppShell>
    </EventStreamProvider>
  );
}

async function ChannelList() {
  const channels = await getChannels();
  return <ChannelNav channels={channels} />;
}

function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          className="h-9 animate-pulse rounded-lg bg-surface-muted"
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton estático
          key={i}
        />
      ))}
    </div>
  );
}
