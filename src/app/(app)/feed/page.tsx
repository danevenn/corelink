import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

// Placeholder de Fase 2: el feed real llega en Fase 4.
// Aquí solo demostramos que la autenticación funciona de extremo a extremo.
export default async function FeedPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const { user } = session;
  const displayName = user.isAnonymous ? "Invitado" : user.name;

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Feed
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Sesión iniciada como{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {displayName}
          </span>
          {user.isAnonymous ? null : <> ({user.email})</>}.
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          El feed real se construye en la Fase 4. Esta página solo confirma que
          la autenticación funciona.
        </p>
        <div className="flex justify-center">
          <LogoutButton />
        </div>
      </div>
    </section>
  );
}
