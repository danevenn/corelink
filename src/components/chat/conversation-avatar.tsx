// Avatar de una conversación: el del otro participante (DM) o un stack de
// avatares de miembros / icono de grupo (GROUP). Presentacional puro.

import { Avatar } from "@/components/feed/avatar";
import { GroupIcon } from "@/components/feed/icons";
import { cn } from "@/lib/utils";
import type { ChatParticipant, ConversationType } from "@/server/chat";

type Props = {
  type: ConversationType;
  otherParticipant: ChatParticipant | null;
  memberPreviews: ChatParticipant[];
  className?: string;
};

export function ConversationAvatar({
  type,
  otherParticipant,
  memberPreviews,
  className,
}: Props) {
  if (type === "DIRECT" && otherParticipant) {
    return (
      <Avatar
        className={className}
        name={otherParticipant.displayName}
        seed={otherParticipant.id}
        size="md"
        src={otherParticipant.avatarUrl}
      />
    );
  }

  // Grupo: dos avatares apilados si los hay, si no un icono de grupo.
  const preview = memberPreviews.slice(0, 2);
  if (preview.length === 0) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand",
          className,
        )}
      >
        <GroupIcon className="size-5" />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn("relative size-10 shrink-0", className)}
    >
      {preview[0] ? (
        <Avatar
          className="absolute left-0 top-0 size-7 ring-2 ring-surface"
          name={preview[0].displayName}
          seed={preview[0].id}
          size="sm"
          src={preview[0].avatarUrl}
        />
      ) : null}
      {preview[1] ? (
        <Avatar
          className="absolute bottom-0 right-0 size-7 ring-2 ring-surface"
          name={preview[1].displayName}
          seed={preview[1].id}
          size="sm"
          src={preview[1].avatarUrl}
        />
      ) : null}
    </span>
  );
}
