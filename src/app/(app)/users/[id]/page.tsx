import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StartDirectButton } from "@/components/chat/start-direct-button";
import { Avatar } from "@/components/feed/avatar";
import { EmptyState } from "@/components/feed/empty-state";
import { FollowButton } from "@/components/feed/follow-button";
import {
  BriefcaseIcon,
  CalendarIcon,
  HashIcon,
  OfficialIcon,
} from "@/components/feed/icons";
import { FadeIn, FeedItem, MotionProvider } from "@/components/feed/motion";
import { PostCard } from "@/components/feed/post-card";
import { absoluteTime } from "@/lib/feed-ui";
import { canModerate, getViewer as getAuthViewer } from "@/server/authz";
import {
  getUserPosts,
  getUserProfile,
  type UserProfileView,
} from "@/server/users";
import { getViewer } from "@/server/viewer";

/** Fecha "miembro desde": día, mes y año, sin hora. */
function memberSince(date: Date): string {
  return new Date(date).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const ROLE_BADGE = {
  admin: { label: "Administrador", className: "bg-brand-soft text-brand" },
  moderator: {
    label: "Moderación",
    className: "bg-official-soft text-official",
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getUserProfile(id);
  if (!profile) return { title: "Perfil no encontrado" };
  return {
    title: profile.displayName,
    description: `Perfil de ${profile.displayName} en CoreLink.`,
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const viewer = await getViewer();
  if (!viewer) notFound();

  const profile = await getUserProfile(id);
  if (!profile) notFound();

  // Rol del viewer (servidor): decide si las cards muestran el control oficial.
  const authViewer = await getAuthViewer();
  const staff = authViewer ? canModerate(authViewer.role) : false;

  const feed = await getUserPosts(id);

  return (
    <div className="flex flex-col gap-6">
      <MotionProvider>
        <FadeIn>
          <ProfileHeader profile={profile} />
        </FadeIn>
      </MotionProvider>

      <section aria-label={`Publicaciones de ${profile.displayName}`}>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Publicaciones
          <span className="ml-1.5 text-xs font-normal text-muted-foreground tabular-nums">
            ({feed.posts.length})
          </span>
        </h2>

        <div aria-live="polite">
          {feed.posts.length === 0 ? (
            <EmptyState
              description={
                profile.follow.isSelf
                  ? "Aún no has publicado nada. Comparte algo en el feed para empezar."
                  : "Este usuario aún no ha publicado."
              }
              icon={<OfficialIcon className="size-5" />}
              title="Todavía no hay publicaciones"
            />
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
      </section>
    </div>
  );
}

function ProfileHeader({ profile }: { profile: UserProfileView }) {
  const roleBadge =
    profile.role === "admin" || profile.role === "moderator"
      ? ROLE_BADGE[profile.role]
      : null;

  return (
    <header className="overflow-hidden rounded-3xl border border-border bg-surface shadow-soft">
      {/* Banda decorativa de marca (teal) que da identidad a la cabecera. */}
      <div
        aria-hidden="true"
        className="h-20 bg-gradient-to-r from-brand/80 via-brand/40 to-accent2/20 sm:h-24"
      />

      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="-mt-14 flex flex-wrap items-end justify-between gap-4 sm:-mt-16">
          <Avatar
            className="size-20 rounded-full text-2xl ring-4 ring-surface sm:size-24"
            name={profile.displayName}
            seed={profile.id}
            size="lg"
            src={profile.avatarUrl}
          />

          <div className="flex items-center gap-2">
            {/* Iniciar/abrir un DM con esta persona (oculto en el propio perfil). */}
            <StartDirectButton
              isSelf={profile.follow.isSelf}
              targetName={profile.displayName}
              targetUserId={profile.id}
            />
            {/* Oculto si es el propio perfil (FollowButton ya lo gestiona). */}
            <FollowButton
              followerCount={profile.follow.followerCount}
              isFollowing={profile.follow.isFollowing}
              isSelf={profile.follow.isSelf}
              showCount={false}
              targetName={profile.displayName}
              targetUserId={profile.id}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">
              {profile.displayName}
            </h1>
            {profile.follow.isSelf ? (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Tú
              </span>
            ) : null}
            {roleBadge ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${roleBadge.className}`}
              >
                <OfficialIcon className="size-3" />
                {roleBadge.label}
              </span>
            ) : null}
          </div>

          {/* Meta: puesto, departamento, alta. */}
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {profile.jobTitle ? (
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Puesto</dt>
                <BriefcaseIcon className="size-3.5 shrink-0" />
                <dd>{profile.jobTitle}</dd>
              </div>
            ) : null}
            {profile.department ? (
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Departamento</dt>
                <dd>
                  <Link
                    className="inline-flex items-center gap-0.5 rounded-full bg-surface-muted px-2 py-0.5 font-medium transition hover:text-brand"
                    href={`/channels/${profile.department.slug}`}
                  >
                    <HashIcon className="size-3" />
                    {profile.department.name}
                  </Link>
                </dd>
              </div>
            ) : null}
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Miembro desde</dt>
              <CalendarIcon className="size-3.5 shrink-0" />
              <dd>
                <time
                  dateTime={new Date(profile.createdAt).toISOString()}
                  title={absoluteTime(profile.createdAt)}
                >
                  Miembro desde {memberSince(profile.createdAt)}
                </time>
              </dd>
            </div>
          </dl>
        </div>

        {profile.bio ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
            {profile.bio}
          </p>
        ) : null}

        {/* Contadores de seguidores / seguidos. */}
        <dl className="flex items-center gap-5 border-t border-border pt-3 text-sm">
          <div className="flex items-center gap-1.5">
            <dt className="text-muted-foreground">Seguidores</dt>
            <dd className="font-semibold text-foreground tabular-nums">
              {profile.follow.followerCount}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="text-muted-foreground">Siguiendo</dt>
            <dd className="font-semibold text-foreground tabular-nums">
              {profile.follow.followingCount}
            </dd>
          </div>
        </dl>
      </div>
    </header>
  );
}
