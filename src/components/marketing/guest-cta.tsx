"use client";

// CTA "Entrar como invitado" para la landing pública. Crea una sesión anónima
// con Better Auth y redirige al feed. Aislado como island: el resto de la
// landing es Server Component estático.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  children?: React.ReactNode;
};

export function GuestCta({
  className,
  children = "Entrar como invitado",
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuest() {
    setError(null);
    setPending(true);
    const { error: signInError } = await signIn.anonymous();

    if (signInError) {
      setPending(false);
      setError(signInError.message ?? "No se pudo entrar como invitado.");
      return;
    }

    router.push("/feed");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        className={cn(
          "inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-60",
          className,
        )}
        disabled={pending}
        onClick={handleGuest}
        type="button"
      >
        {pending ? "Entrando…" : children}
      </button>
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
