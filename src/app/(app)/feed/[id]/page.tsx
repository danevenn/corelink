import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthorFollowCard } from "@/components/feed/author-follow-card";
import { EmptyState } from "@/components/feed/empty-state";
import { ReplyIcon } from "@/components/feed/icons";
import { FadeIn, FeedItem, MotionProvider } from "@/components/feed/motion";
import { PostCard } from "@/components/feed/post-card";
import { ReplyForm } from "@/components/feed/reply-form";
import { getFollowState, getPostById } from "@/server/posts";
import { getViewer } from "@/server/viewer";

export default async function PostThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const viewer = await getViewer();
  if (!viewer) notFound();

  const thread = await getPostById(id);
  if (!thread) notFound();

  const { post, replies } = thread;

  // Estado de follow del autor del post raíz (para el botón Seguir).
  const followState = await getFollowState(post.author.id);

  return (
    <div className="flex flex-col gap-5">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        href={post.channel ? `/feed?channel=${post.channel.slug}` : "/feed"}
      >
        <svg
          aria-hidden="true"
          fill="none"
          height={16}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
          width={16}
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver al feed
      </Link>

      <MotionProvider>
        <FadeIn className="flex flex-col gap-3">
          <AuthorFollowCard author={post.author} followState={followState} />
          <PostCard post={post} variant="detail" viewerId={viewer.id} />
        </FadeIn>
      </MotionProvider>

      <section aria-label="Respuestas" className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ReplyIcon className="size-4" />
          {post.replyCount} {post.replyCount === 1 ? "respuesta" : "respuestas"}
        </h2>

        <ReplyForm parentId={post.id} viewer={viewer} />

        {replies.length === 0 ? (
          <EmptyState
            description="Sé la primera persona en responder a este hilo."
            icon={<ReplyIcon className="size-5" />}
            title="Aún no hay respuestas"
          />
        ) : (
          <MotionProvider>
            <ul className="flex flex-col gap-3 border-l-2 border-border pl-3 sm:pl-5">
              {replies.map((reply, index) => (
                <li key={reply.id}>
                  <FeedItem index={index}>
                    <PostCard
                      post={reply}
                      variant="reply"
                      viewerId={viewer.id}
                    />
                  </FeedItem>
                </li>
              ))}
            </ul>
          </MotionProvider>
        )}
      </section>
    </div>
  );
}
