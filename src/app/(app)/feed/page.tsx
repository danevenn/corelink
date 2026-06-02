import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/feed/empty-state";
import { FeedTabs } from "@/components/feed/feed-tabs";
import { HomeIcon, OfficialIcon } from "@/components/feed/icons";
import { FeedItem, MotionProvider } from "@/components/feed/motion";
import { PostCard } from "@/components/feed/post-card";
import { PostComposer } from "@/components/feed/post-composer";
import { canModerate, getViewer as getAuthViewer } from "@/server/authz";
import { getChannels, getFeed, getFollowingFeed } from "@/server/posts";
import { getViewer } from "@/server/viewer";

export const metadata: Metadata = {
  title: "Feed",
  description: "Lo último de toda la empresa, en un solo lugar.",
};

type SearchParams = Promise<{ channel?: string; view?: string }>;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { channel: channelSlug, view } = await searchParams;
  const following = view === "following";

  const viewer = await getViewer();
  if (!viewer) notFound();

  // Rol del viewer (servidor): decide si las cards muestran el control oficial.
  const authViewer = await getAuthViewer();
  const staff = authViewer ? canModerate(authViewer.role) : false;

  // En "Siguiendo" el filtro por canal no aplica (es un feed personalizado).
  const [feed, channels] = await Promise.all([
    following
      ? getFollowingFeed()
      : getFeed(channelSlug ? { channelSlug } : undefined),
    getChannels(),
  ]);

  const activeChannel =
    !following && channelSlug
      ? channels.find((c) => c.slug === channelSlug)
      : undefined;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">
          {following
            ? "Siguiendo"
            : activeChannel
              ? `# ${activeChannel.name}`
              : "Feed del equipo"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {following
            ? "La actividad de las personas a las que sigues."
            : (activeChannel?.description ??
              "Lo último de toda la empresa, en un solo lugar.")}
        </p>
      </header>

      <FeedTabs
        active={following ? "following" : "general"}
        channelSlug={activeChannel?.slug}
      />

      {following ? null : (
        <PostComposer
          channels={channels}
          defaultChannelId={activeChannel?.id}
          viewer={viewer}
        />
      )}

      <div aria-live="polite" id="feed-panel" role="tabpanel">
        {feed.posts.length === 0 ? (
          following ? (
            <EmptyState
              description="Sigue a compañeros para ver su actividad aquí. Abre cualquier hilo y pulsa “Seguir”."
              icon={<OfficialIcon className="size-5" />}
              title="Aún no sigues a nadie con actividad"
            />
          ) : (
            <EmptyState
              description={
                activeChannel
                  ? "Sé la primera persona en publicar en este canal."
                  : "Aún no hay publicaciones. Comparte algo para empezar."
              }
              icon={<HomeIcon className="size-5" />}
              title="Todavía no hay nada por aquí"
            />
          )
        ) : (
          <MotionProvider>
            <ul className="flex flex-col gap-3">
              {feed.posts.map((post, index) => (
                <li key={post.id}>
                  <FeedItem index={index}>
                    <PostCard
                      canModerate={staff}
                      post={post}
                      viewerId={viewer.id}
                    />
                  </FeedItem>
                </li>
              ))}
            </ul>
          </MotionProvider>
        )}
      </div>
    </div>
  );
}
