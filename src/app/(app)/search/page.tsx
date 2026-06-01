import { notFound } from "next/navigation";
import { EmptyState } from "@/components/feed/empty-state";
import { SearchIcon, UsersIcon } from "@/components/feed/icons";
import { FeedItem, MotionProvider } from "@/components/feed/motion";
import { PostCard } from "@/components/feed/post-card";
import { UserResultCard } from "@/components/feed/user-result-card";
import { canModerate, getViewer as getAuthViewer } from "@/server/authz";
import { searchPosts, searchUsers } from "@/server/search";
import { getViewer } from "@/server/viewer";

type SearchParams = Promise<{ q?: string }>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const viewer = await getViewer();
  if (!viewer) notFound();

  const authViewer = await getAuthViewer();
  const staff = authViewer ? canModerate(authViewer.role) : false;

  // Sin término: pantalla de sugerencia, sin tocar la BD.
  if (query.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <SearchHeader query="" />
        <EmptyState
          description="Escribe en la barra de búsqueda para encontrar publicaciones por su contenido o personas por su nombre y puesto."
          icon={<SearchIcon className="size-5" />}
          title="Busca en CoreLink"
        />
      </div>
    );
  }

  // Búsqueda en paralelo: posts (FTS) + personas (FTS sobre el perfil).
  const [postResults, userResults] = await Promise.all([
    searchPosts(query),
    searchUsers(query),
  ]);

  const noResults = postResults.posts.length === 0 && userResults.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <SearchHeader query={query} />

      <div aria-live="polite">
        {noResults ? (
          <EmptyState
            description="No encontramos publicaciones ni personas para tu búsqueda. Prueba con otras palabras."
            icon={<SearchIcon className="size-5" />}
            title={`Sin resultados para “${query}”`}
          />
        ) : (
          <div className="flex flex-col gap-8">
            <section aria-labelledby="search-people">
              <h2
                className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"
                id="search-people"
              >
                <UsersIcon className="size-4" />
                Personas
                <span className="text-xs font-normal text-muted-foreground tabular-nums">
                  ({userResults.length})
                </span>
              </h2>
              {userResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ninguna persona coincide con “{query}”.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {userResults.map((user) => (
                    <li key={user.userId}>
                      <UserResultCard user={user} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="search-posts">
              <h2
                className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"
                id="search-posts"
              >
                <SearchIcon className="size-4" />
                Publicaciones
                <span className="text-xs font-normal text-muted-foreground tabular-nums">
                  ({postResults.posts.length})
                </span>
              </h2>
              {postResults.posts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ninguna publicación coincide con “{query}”.
                </p>
              ) : (
                <MotionProvider>
                  <ul className="flex flex-col gap-3">
                    {postResults.posts.map((post, index) => (
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
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchHeader({ query }: { query: string }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-lg font-semibold text-foreground">
        {query ? <>Resultados para “{query}”</> : "Búsqueda"}
      </h1>
      <p className="text-sm text-muted-foreground">
        Publicaciones y personas de toda la empresa.
      </p>
    </header>
  );
}
