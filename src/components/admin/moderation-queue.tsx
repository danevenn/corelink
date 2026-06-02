"use client";

// Cola de moderación (Fase 10b) — contenido reciente a revisar (raíces +
// respuestas). Variante COMPACTA de PostCard pensada para revisión rápida.
//
// Lectura inicial: server (`listRecentPosts`). Paginación: `fetchRecentPosts`
// (wrapper "use server"). Borrado: `deletePost`, que en servidor permite a staff
// retirar cualquier post. Cada borrado pasa por ConfirmDialog (destructivo).

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/feed/avatar";
import { HashIcon, OfficialIcon, TrashIcon } from "@/components/feed/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { absoluteTime, relativeTime } from "@/lib/feed-ui";
import { fetchRecentPosts } from "@/server/admin/moderation-actions";
import { deletePost } from "@/server/post-actions";
import type { FeedPage, PostWithMeta } from "@/server/posts";

export function ModerationQueue({
  initialPage,
  viewerId,
}: {
  initialPage: FeedPage;
  viewerId: string;
}) {
  const [posts, setPosts] = useState<PostWithMeta[]>(initialPage.posts);
  const [cursor, setCursor] = useState<string | null>(initialPage.nextCursor);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  function loadMore() {
    if (!cursor) return;
    startLoad(async () => {
      const page = await fetchRecentPosts({ cursor, limit: 20 });
      if (!("posts" in page)) {
        setStatus(page.error.message);
        return;
      }
      setPosts((prev) => [...prev, ...page.posts]);
      setCursor(page.nextCursor);
    });
  }

  function onDeleted(id: string, authorName: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setStatus(`Contenido de ${authorName} retirado.`);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Contenido reciente de toda la empresa (incluye respuestas). Retira lo
        que infrinja las normas; el borrado es definitivo y arrastra las
        respuestas.
      </p>

      <p aria-live="polite" className="sr-only" role="status">
        {status ?? ""}
      </p>

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          No hay contenido reciente que revisar.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {posts.map((post) => (
            <ModerationRow
              key={post.id}
              onDeleted={onDeleted}
              post={post}
              viewerId={viewerId}
            />
          ))}
        </ul>
      )}

      {cursor ? (
        <button
          className="self-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-50"
          disabled={loading}
          onClick={loadMore}
          type="button"
        >
          {loading ? "Cargando…" : "Cargar más"}
        </button>
      ) : null}
    </div>
  );
}

function ModerationRow({
  post,
  viewerId,
  onDeleted,
}: {
  post: PostWithMeta;
  viewerId: string;
  onDeleted: (id: string, authorName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isOwn = post.author.id === viewerId;
  const isReply = post.parentId !== null;

  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deletePost(post.id);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setOpen(false);
      onDeleted(post.id, post.author.displayName);
    });
  }

  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
      <Avatar
        name={post.author.displayName}
        seed={post.author.id}
        size="sm"
        src={post.author.avatarUrl}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <Link
            className="font-medium text-foreground hover:text-brand"
            href={`/users/${post.author.id}`}
          >
            {post.author.displayName}
          </Link>
          <time
            className="text-muted-foreground"
            dateTime={new Date(post.createdAt).toISOString()}
            title={absoluteTime(post.createdAt)}
          >
            {relativeTime(post.createdAt)}
          </time>
          {isReply ? (
            <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              respuesta
            </span>
          ) : null}
          {post.isOfficial ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-official-soft px-1.5 py-0.5 text-[10px] font-semibold text-official">
              <OfficialIcon className="size-3" />
              Oficial
            </span>
          ) : null}
          {post.channel ? (
            <span className="inline-flex items-center gap-0.5 text-muted-foreground">
              <HashIcon className="size-3" />
              {post.channel.name}
            </span>
          ) : null}
        </div>

        {post.content.trim().length > 0 ? (
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm text-foreground">
            {post.content}
          </p>
        ) : (
          <p className="mt-1 text-sm italic text-muted-foreground">
            (sin texto · {post.attachments.length} adjunto
            {post.attachments.length === 1 ? "" : "s"})
          </p>
        )}

        <div className="mt-2 flex items-center gap-3">
          <Link
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            href={`/feed/${isReply ? post.parentId : post.id}`}
          >
            Ver en contexto
          </Link>
        </div>
      </div>

      <button
        aria-label={`Borrar contenido de ${post.author.displayName}`}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-danger/40 px-2 py-1 text-xs font-medium text-danger transition hover:bg-danger-soft disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        type="button"
      >
        <TrashIcon className="size-3.5" />
        Borrar
      </button>

      <ConfirmDialog
        confirmLabel="Sí, borrar"
        description={
          isOwn ? (
            <>Vas a borrar tu propio contenido. No se puede deshacer.</>
          ) : (
            <>
              Vas a borrar como <strong>moderación</strong> contenido de{" "}
              <strong>{post.author.displayName}</strong>. No se puede deshacer y
              arrastra sus respuestas.
            </>
          )
        }
        destructive
        error={error}
        onCancel={() => setOpen(false)}
        onConfirm={confirmDelete}
        open={open}
        pending={pending}
        title="Borrar contenido"
      />
    </li>
  );
}
