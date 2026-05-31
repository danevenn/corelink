import { notFound } from "next/navigation";
import { EmptyState } from "@/components/feed/empty-state";
import { HomeIcon } from "@/components/feed/icons";
import { FeedItem, MotionProvider } from "@/components/feed/motion";
import { PostCard } from "@/components/feed/post-card";
import { PostComposer } from "@/components/feed/post-composer";
import { getChannels, getFeed } from "@/server/posts";
import { getViewer } from "@/server/viewer";

type SearchParams = Promise<{ channel?: string }>;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { channel: channelSlug } = await searchParams;

  const viewer = await getViewer();
  if (!viewer) notFound();

  const [feed, channels] = await Promise.all([
    getFeed(channelSlug ? { channelSlug } : undefined),
    getChannels(),
  ]);

  const activeChannel = channelSlug
    ? channels.find((c) => c.slug === channelSlug)
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">
          {activeChannel ? `# ${activeChannel.name}` : "Feed del equipo"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {activeChannel?.description ??
            "Lo último de toda la empresa, en un solo lugar."}
        </p>
      </header>

      <PostComposer
        channels={channels}
        defaultChannelId={activeChannel?.id}
        viewer={viewer}
      />

      {feed.posts.length === 0 ? (
        <EmptyState
          description={
            activeChannel
              ? "Sé la primera persona en publicar en este canal."
              : "Aún no hay publicaciones. Comparte algo para empezar."
          }
          icon={<HomeIcon className="size-5" />}
          title="Todavía no hay nada por aquí"
        />
      ) : (
        <MotionProvider>
          <ul className="flex flex-col gap-3">
            {feed.posts.map((post, index) => (
              <li key={post.id}>
                <FeedItem index={index}>
                  <PostCard post={post} viewerId={viewer.id} />
                </FeedItem>
              </li>
            ))}
          </ul>
        </MotionProvider>
      )}
    </div>
  );
}
