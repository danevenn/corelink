import Link from "next/link";
import { AttachmentGallery } from "@/components/media/attachment-gallery";
import { absoluteTime, relativeTime } from "@/lib/feed-ui";
import { cn } from "@/lib/utils";
import type { PostWithMeta } from "@/server/posts";
import { Avatar } from "./avatar";
import { HashIcon, OfficialIcon, ReplyIcon } from "./icons";
import { ModerateDeleteButton } from "./moderate-delete-button";
import { OfficialToggle } from "./official-toggle";
import { PostActionsMenu } from "./post-actions-menu";
import { ReactionBar } from "./reaction-bar";

type PostCardProps = {
  post: PostWithMeta;
  viewerId: string;
  /** En el detalle, la card raíz no enlaza a sí misma ni muestra "ver hilo". */
  variant?: "feed" | "detail" | "reply";
  /**
   * ¿El viewer es staff (admin/moderator)? Decidido SIEMPRE en servidor.
   * Si es true, en lugar del badge estático se muestra el control para
   * marcar/desmarcar oficial (la action re-verifica el rol igualmente).
   */
  canModerate?: boolean;
};

/** Tarjeta de post. Server Component presentacional. */
export function PostCard({
  post,
  viewerId,
  variant = "feed",
  canModerate = false,
}: PostCardProps) {
  const isAuthor = post.author.id === viewerId;
  const isReply = variant === "reply";
  const href = `/feed/${post.id}`;
  const authorHref = `/users/${post.author.id}`;

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-shadow sm:p-5",
        variant === "feed" && "hover:shadow-md hover:shadow-black/5",
        post.isOfficial && "border-official/40",
        isReply &&
          "rounded-xl border-l-2 border-l-border bg-surface p-3 sm:p-4",
      )}
    >
      {post.isOfficial ? (
        <span
          className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-official/70 to-official/20"
          aria-hidden="true"
        />
      ) : null}

      <header className="flex items-start gap-3">
        <Link
          className="shrink-0 rounded-full"
          href={authorHref}
          aria-label={`Ver el perfil de ${post.author.displayName}`}
          tabIndex={-1}
        >
          <Avatar
            name={post.author.displayName}
            seed={post.author.id}
            size={isReply ? "sm" : "md"}
            src={post.author.avatarUrl}
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link
              className="truncate rounded font-semibold text-foreground transition hover:text-brand"
              href={authorHref}
            >
              {post.author.displayName}
            </Link>
            {post.author.jobTitle ? (
              <span className="truncate text-xs text-muted-foreground">
                · {post.author.jobTitle}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <time
              dateTime={new Date(post.createdAt).toISOString()}
              title={absoluteTime(post.createdAt)}
            >
              {relativeTime(post.createdAt)}
            </time>
            {post.editedAt ? (
              <span title={`Editado ${absoluteTime(post.editedAt)}`}>
                · editado
              </span>
            ) : null}
            {post.channel ? (
              <Link
                className="inline-flex items-center gap-0.5 rounded-full bg-surface-muted px-2 py-0.5 font-medium text-muted-foreground transition hover:text-brand"
                href={`/channels/${post.channel.slug}`}
              >
                <HashIcon className="size-3" />
                {post.channel.name}
              </Link>
            ) : null}
          </div>
        </div>

        {canModerate ? (
          <OfficialToggle isOfficial={post.isOfficial} postId={post.id} />
        ) : post.isOfficial ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-official-soft px-2.5 py-1 text-xs font-semibold text-official">
            <OfficialIcon className="size-3.5" />
            <span className="hidden sm:inline">Procedimiento oficial</span>
            <span className="sm:hidden">Oficial</span>
          </span>
        ) : null}
      </header>

      {post.content.trim().length > 0 ? (
        variant === "feed" ? (
          <Link
            className="-mx-1 rounded-lg px-1 outline-none"
            href={href}
            aria-label="Abrir hilo del post"
          >
            <PostBody content={post.content} />
          </Link>
        ) : (
          <PostBody content={post.content} />
        )
      ) : null}

      {post.attachments.length > 0 ? (
        <AttachmentGallery
          attachments={post.attachments}
          authorName={post.author.displayName}
        />
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <ReactionBar
          breakdown={post.reactionsByType}
          postId={post.id}
          total={post.reactionsTotal}
          viewerReaction={post.viewerReaction}
        />

        <div className="flex items-center gap-3">
          {variant === "feed" ? (
            <Link
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
              href={href}
            >
              <ReplyIcon className="size-3.5" />
              <span className="tabular-nums">{post.replyCount}</span>
              <span className="hidden sm:inline">
                {post.replyCount === 1 ? "respuesta" : "respuestas"}
              </span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ReplyIcon className="size-3.5" />
              <span className="tabular-nums">{post.replyCount}</span>
              {post.replyCount === 1 ? "respuesta" : "respuestas"}
            </span>
          )}

          {isAuthor ? (
            <PostActionsMenu initialContent={post.content} postId={post.id} />
          ) : canModerate ? (
            // Staff (admin/moderator) puede retirar contenido ajeno desde el
            // feed normal. Visualmente diferenciado de las acciones de autor.
            <ModerateDeleteButton
              authorName={post.author.displayName}
              postId={post.id}
            />
          ) : null}
        </div>
      </footer>
    </article>
  );
}

/** Renderiza el contenido respetando saltos de línea (sin HTML del usuario). */
function PostBody({ content }: { content: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
      {content}
    </p>
  );
}
