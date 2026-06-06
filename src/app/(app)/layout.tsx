import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MessagesNavLink } from "@/components/chat/messages-nav-link";
import { EventStreamProvider } from "@/components/events/event-stream-provider";
import { AppShell } from "@/components/feed/app-shell";
import { ChannelNav } from "@/components/feed/channel-nav";
import { NotificationBell } from "@/components/feed/notification-bell";
import { UserMenu } from "@/components/feed/user-menu";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canModerate, getViewer as getAuthViewer } from "@/server/authz";
import { getTotalUnread } from "@/server/chat";
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

  // Una vez confirmada la sesión, el resto de lecturas del shell son
  // independientes entre sí: las disparamos EN PARALELO (antes eran ~5 awaits
  // secuenciales = ~5 roundtrips a Neon encadenados por navegación). Con el
  // `cookieCache` de Better Auth, los `getSession()` internos de `getViewer` y
  // `getAuthViewer` ya no tocan la BD.
  //   - account.mustChangePassword: gate R1 (cambio de contraseña forzado).
  //   - viewer: identidad para la cabecera (displayName/avatar).
  //   - authViewer: rol, para decidir si se muestra "Gestión" (staff).
  //   - unread / unreadMessages: badges de notificaciones y mensajes.
  const [account, viewer, authViewer, unread, unreadMessages] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { mustChangePassword: true },
      }),
      getViewer(),
      getAuthViewer(),
      getUnreadCount(),
      getTotalUnread(),
    ]);

  // Gate R1: cambio de contraseña forzado en el primer login. Bloquea TODA la
  // zona protegida y envía a la página de cambio (fuera del grupo (app), así no
  // se auto-redirige). Defensa en servidor: aquí no se renderiza nada hasta que
  // la contraseña se cambie.
  if (account?.mustChangePassword) {
    redirect("/change-password");
  }

  if (!viewer) {
    redirect("/login");
  }

  // Rol del viewer (servidor): decide si se muestra el enlace "Gestión". El
  // panel es accesible a STAFF (admin || moderator) y se re-protege en su propio
  // layout; aquí solo evitamos mostrar de más.
  const viewerIsStaff = authViewer ? canModerate(authViewer.role) : false;

  return (
    // Una sola EventSource para toda la zona autenticada: la campana y el chat
    // (Fase 8b) reutilizan la MISMA conexión sin duplicarla.
    <EventStreamProvider>
      <AppShell
        isStaff={viewerIsStaff}
        messages={<MessagesNavLink initialUnread={unreadMessages} />}
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
