// Cabecera de una conversación abierta: avatar + nombre. En DM enlaza al perfil
// del otro usuario; en grupo lista los miembros. Server Component presentacional.
// Incluye un botón "volver" (solo móvil) que regresa a la lista.

import Link from "next/link";
import { ArrowLeftIcon } from "@/components/feed/icons";
import type { ConversationDetail } from "@/server/chat";
import { ConversationAvatar } from "./conversation-avatar";

type Props = {
  detail: ConversationDetail;
  viewerId: string;
};

export function ConversationHeader({ detail, viewerId }: Props) {
  const isDirect = detail.type === "DIRECT";
  const others = detail.members.filter((m) => m.user.id !== viewerId);
  const other = others[0]?.user ?? null;
  const title = isDirect ? (other?.displayName ?? "Conversación") : detail.name;

  return (
    <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
      <Link
        aria-label="Volver a la lista"
        className="-ml-1 grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-surface-muted hover:text-foreground md:hidden"
        href="/messages"
      >
        <ArrowLeftIcon className="size-5" />
      </Link>

      <ConversationAvatar
        memberPreviews={others.map((m) => m.user)}
        otherParticipant={isDirect ? other : null}
        type={detail.type}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {isDirect && other ? (
          <Link
            className="truncate text-sm font-semibold text-foreground transition hover:text-brand"
            href={`/users/${other.id}`}
          >
            {title}
          </Link>
        ) : (
          <span className="truncate text-sm font-semibold text-foreground">
            {title}
          </span>
        )}
        <span className="truncate text-xs text-muted-foreground">
          {isDirect
            ? (other?.jobTitle ?? "Mensaje directo")
            : memberList(detail, viewerId)}
        </span>
      </div>
    </header>
  );
}

/** "Tú, Ana, Diego y 2 más" para el subtítulo de un grupo. */
function memberList(detail: ConversationDetail, viewerId: string): string {
  const names = detail.members.map((m) =>
    m.user.id === viewerId ? "Tú" : m.user.displayName,
  );
  if (names.length <= 4) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} y ${names.length - 3} más`;
}
