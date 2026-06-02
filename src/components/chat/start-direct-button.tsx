"use client";

// Botón "Enviar mensaje" en el perfil de un usuario: abre (o crea) el DM 1:1 con
// él y navega a la conversación. Oculto si es el propio perfil del viewer.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MessageIcon } from "@/components/feed/icons";
import { Button } from "@/components/ui/button";
import { getOrCreateDirectConversation } from "@/server/chat-actions";

type Props = {
  targetUserId: string;
  targetName: string;
  isSelf: boolean;
};

export function StartDirectButton({ targetUserId, targetName, isSelf }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isSelf) return null;

  function open() {
    setError(null);
    startTransition(async () => {
      const res = await getOrCreateDirectConversation({
        otherUserId: targetUserId,
      });
      if (res.ok) {
        router.push(`/messages/${res.data.conversationId}`);
      } else {
        setError(res.error.message);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        aria-label={`Enviar un mensaje a ${targetName}`}
        className="rounded-full"
        disabled={pending}
        onClick={open}
        size="sm"
        type="button"
        variant="outline"
      >
        <MessageIcon className="size-4" />
        {pending ? "Abriendo…" : "Enviar mensaje"}
      </Button>
      {error ? (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
