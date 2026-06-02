import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChannelTabs } from "@/components/feed/channel-tabs";
import { EmptyState } from "@/components/feed/empty-state";
import { HashIcon, OfficialIcon } from "@/components/feed/icons";
import { FeedItem, MotionProvider } from "@/components/feed/motion";
import { PostCard } from "@/components/feed/post-card";
import { PostComposer } from "@/components/feed/post-composer";
import { canModerate, getViewer as getAuthViewer } from "@/server/authz";
import {
  getChannelBySlug,
  getChannels,
  getFeed,
  getOfficialPosts,
} from "@/server/posts";
import { getViewer } from "@/server/viewer";

type SearchParams = Promise<{ view?: string }>;

const TYPE_LABEL = {
  DEPARTMENT: "Departamento",
  TOPIC: "Tema",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const channel = await getChannelBySlug(slug);
  if (!channel) return { title: "Canal no encontrado" };
  return {
    title: `#${channel.name}`,
    description: channel.description ?? `Canal #${channel.name} en CoreLink.`,
  };
}

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const { view } = await searchParams;
  const official = view === "official";

  const viewer = await getViewer();
  if (!viewer) notFound();

  const channel = await getChannelBySlug(slug);
  if (!channel) notFound();

  // Rol del viewer (servidor): habilita el control de marcar oficial.
  const authViewer = await getAuthViewer();
  const staff = authViewer ? canModerate(authViewer.role) : false;

  // Feed del canal: todos, o solo procedimientos oficiales según la pestaña.
  const [feed, channels] = await Promise.all([
    official
      ? getOfficialPosts({ channelSlug: slug })
      : getFeed({ channelSlug: slug }),
    getChannels(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2 rounded-3xl border border-border bg-surface p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <HashIcon className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-lg font-semibold text-foreground">
              {channel.name}
            </h1>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {TYPE_LABEL[channel.type]} ·{" "}
              <span className="tabular-nums">{channel.postCount}</span>{" "}
              {channel.postCount === 1 ? "publicación" : "publicaciones"}
            </span>
          </div>
        </div>
        {channel.description ? (
          <p className="text-sm text-muted-foreground">{channel.description}</p>
        ) : null}
      </header>

      <ChannelTabs active={official ? "official" : "all"} slug={slug} />

      {official ? null : (
        <PostComposer
          channels={channels}
          defaultChannelId={channel.id}
          viewer={viewer}
        />
      )}

      <div aria-live="polite" id="channel-panel" role="tabpanel">
        {feed.posts.length === 0 ? (
          official ? (
            <EmptyState
              description="Cuando el equipo de moderación marque publicaciones de este canal como procedimientos oficiales, aparecerán aquí."
              icon={<OfficialIcon className="size-5" />}
              title="Aún no hay procedimientos oficiales"
            />
          ) : (
            <EmptyState
              description="Sé la primera persona en publicar en este canal."
              icon={<HashIcon className="size-5" />}
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
