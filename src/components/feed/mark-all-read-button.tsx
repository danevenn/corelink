"use client";

// Botón "Marcar todas como leídas" de la página de notificaciones (Fase 7b).
// UI optimista: se desactiva al instante; el servidor reconcilia y revalida.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markNotificationsRead } from "@/server/notification-actions";

type Props = {
  /** Si ya está todo leído, el botón nace deshabilitado. */
  hasUnread: boolean;
};

export function MarkAllReadButton({ hasUnread }: Props) {
  const router = useRouter();
  const [done, setDone] = useState(!hasUnread);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setDone(true);
    startTransition(async () => {
      await markNotificationsRead();
      router.refresh();
    });
  }

  return (
    <Button
      className="rounded-full"
      disabled={done || pending}
      onClick={handleClick}
      size="sm"
      type="button"
      variant="outline"
    >
      {pending ? "Marcando…" : "Marcar todas como leídas"}
    </Button>
  );
}
