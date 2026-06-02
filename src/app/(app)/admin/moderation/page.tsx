import { ModerationQueue } from "@/components/admin/moderation-queue";
import { listRecentPosts } from "@/server/admin/moderation";
import { getViewer } from "@/server/authz";

// /admin/moderation — cola de contenido reciente (raíces + respuestas).
// El PANEL es staff (gate de staff en el layout) y esta sección es accesible a
// STAFF (admin || moderator). La lectura `listRecentPosts` es staff-only en
// servidor (defensa en profundidad). Los moderadores también pueden moderar
// desde el feed normal (botón "Moderar" en cada PostCard ajeno).
export default async function AdminModerationPage() {
  const viewer = await getViewer();
  const page = await listRecentPosts({ limit: 20 });

  if (!("posts" in page)) {
    return (
      <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
        {page.error.message}
      </p>
    );
  }

  return <ModerationQueue initialPage={page} viewerId={viewer?.id ?? ""} />;
}
