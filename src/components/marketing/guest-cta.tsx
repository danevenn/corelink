"use client";

// CTA "Probar demo" para la landing pública (R1). Sustituye al antiguo "Entrar
// como invitado" (plugin anonymous, eliminado): ahora inicia sesión con una
// cuenta demo REAL sembrada vía la Server Action `demoLogin`, gated por entorno.
// Si `NEXT_PUBLIC_DEMO_MODE` no está activo, el botón NO se renderiza.
// Aislado como island: el resto de la landing es Server Component estático.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { demoLogin } from "@/server/demo";

const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type Props = {
  className?: string;
  children?: React.ReactNode;
};

export function GuestCta({ className, children = "Probar demo" }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // En el producto real (env off) no existe el acceso demo: no se pinta nada.
  if (!DEMO_ENABLED) return null;

  async function handleDemo() {
    setError(null);
    setPending(true);
    const result = await demoLogin();

    if (!result.ok) {
      setPending(false);
      setError(result.error.message);
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
        onClick={handleDemo}
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
