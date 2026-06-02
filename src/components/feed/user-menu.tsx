"use client";

// Chip de usuario actual con logout. Reutiliza signOut de Better Auth.
// Cliente por el menú desplegable y la acción de cierre de sesión.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/auth-client";
import { Avatar } from "./avatar";

type Props = {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  isAnonymous: boolean;
};

export function UserMenu({
  id,
  displayName,
  email,
  avatarUrl,
  isAnonymous,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleLogout() {
    setPending(true);
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Cuenta de ${displayName}`}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-surface-muted"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <Avatar name={displayName} seed={id} size="sm" src={avatarUrl} />
        <span className="hidden max-w-32 truncate text-sm font-medium text-foreground sm:inline">
          {displayName}
        </span>
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
          role="menu"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium text-foreground">
              {displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {isAnonymous ? "Sesión de invitado" : email}
            </p>
          </div>
          <button
            className="flex w-full items-center px-4 py-2.5 text-left text-sm text-foreground transition hover:bg-surface-muted disabled:opacity-60"
            disabled={pending}
            onClick={handleLogout}
            role="menuitem"
            type="button"
          >
            {pending ? "Saliendo…" : "Cerrar sesión"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
