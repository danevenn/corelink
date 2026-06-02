"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth-client";
import { loginSchema } from "@/lib/validations/auth";
import { demoLogin } from "@/server/demo";

// R1: el acceso demo se muestra solo si el entorno lo activa. `NEXT_PUBLIC_*`
// está disponible en el cliente; la Server Action `demoLogin` lo revalida.
const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// useSearchParams() exige un límite de Suspense para el prerender estático.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/feed";

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !errors[key]) {
          errors[key] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    const { error } = await signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setPending(false);

    if (error) {
      setFormError(error.message ?? "No se pudo iniciar sesión.");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Bienvenido de nuevo
        </h1>
        <p className="text-sm text-muted-foreground">
          Accede a tu espacio de trabajo en CoreLink.
        </p>
      </header>

      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            autoComplete="email"
            id="email"
            name="email"
            placeholder="tu.nombre@empresa.com"
            type="email"
          />
          {fieldErrors.email ? (
            <p className="text-xs text-danger">{fieldErrors.email}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            autoComplete="current-password"
            id="password"
            name="password"
            type="password"
          />
          {fieldErrors.password ? (
            <p className="text-xs text-danger">{fieldErrors.password}</p>
          ) : null}
        </div>

        {formError ? (
          <p className="text-sm text-danger" role="alert">
            {formError}
          </p>
        ) : null}

        <Button className="w-full" disabled={pending} type="submit">
          {pending ? "Entrando…" : "Iniciar sesión"}
        </Button>
      </form>

      {DEMO_ENABLED ? <DemoButton /> : null}
    </div>
  );
}

// R1: sustituye al antiguo "Entrar como invitado" (anonymous). Inicia sesión con
// una cuenta demo REAL sembrada vía la Server Action `demoLogin` (gated por
// entorno). Solo se renderiza si `NEXT_PUBLIC_DEMO_MODE === "true"`.
function DemoButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDemo() {
    setError(null);
    setPending(true);
    const result = await demoLogin();
    setPending(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    router.push("/feed");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />o
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        className="w-full"
        disabled={pending}
        onClick={handleDemo}
        type="button"
        variant="outline"
      >
        {pending ? "Entrando…" : "Probar demo"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Entra como Lucía Martín y explora CoreLink con datos de ejemplo.
      </p>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
