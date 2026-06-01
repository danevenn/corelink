import { ModerationQueue } from "@/components/admin/moderation-queue";
import { listRecentPosts } from "@/server/admin/moderation";
import { getViewer } from "@/server/authz";

// /admin/moderation — cola de contenido reciente (raíces + respuestas).
// El PANEL es admin-only (gate en el layout). La lectura `listRecentPosts` es
// staff-only en servidor; aquí ya estamos garantizados como admin. Los
// moderators NO entran al panel, pero pueden moderar desde el feed normal
// (botón "Moderar" en cada PostCard ajeno).
export default async function AdminModerationPage() {
  const viewer = await getViewer();
  const page = await listRecentPosts({ limit: 20 });

  if (!("posts" in page)) {
    return (
      <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
        {page.error.message}
      </p>
    );
  }

  return <ModerationQueue initialPage={page} viewerId={viewer?.id ?? ""} />;
}
