import Link from "next/link";
import { UsersIcon } from "@/components/feed/icons";

// 404 específico de perfiles: cuando `getUserProfile` devuelve null.
export default function UserNotFound() {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center"
      role="alert"
    >
      <span className="mb-1 grid size-12 place-items-center rounded-full bg-surface-muted text-muted-foreground">
        <UsersIcon className="size-5" />
      </span>
      <p className="font-medium text-foreground">Perfil no encontrado</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Esta persona no existe o ya no forma parte de CoreLink.
      </p>
      <Link
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
        href="/feed"
      >
        Volver al feed
      </Link>
    </div>
  );
}
