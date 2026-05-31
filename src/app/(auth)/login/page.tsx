"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { signIn } from "@/lib/auth-client";
import { loginSchema } from "@/lib/validations/auth";

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
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Iniciar sesión
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Accede a tu espacio de trabajo en CoreLink.
        </p>
      </header>

      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            htmlFor="email"
          >
            Correo electrónico
          </label>
          <input
            autoComplete="email"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400"
            id="email"
            name="email"
            type="email"
          />
          {fieldErrors.email ? (
            <p className="text-xs text-red-600 dark:text-red-400">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            htmlFor="password"
          >
            Contraseña
          </label>
          <input
            autoComplete="current-password"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400"
            id="password"
            name="password"
            type="password"
          />
          {fieldErrors.password ? (
            <p className="text-xs text-red-600 dark:text-red-400">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {formError}
          </p>
        ) : null}

        <button
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          disabled={pending}
          type="submit"
        >
          {pending ? "Entrando…" : "Iniciar sesión"}
        </button>
      </form>

      <GuestButton />

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        ¿No tienes cuenta?{" "}
        <Link
          className="font-medium text-zinc-900 underline dark:text-zinc-50"
          href="/register"
        >
          Regístrate
        </Link>
      </p>
    </div>
  );
}

function GuestButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuest() {
    setError(null);
    setPending(true);
    const { error: signInError } = await signIn.anonymous();
    setPending(false);

    if (signInError) {
      setError(signInError.message ?? "No se pudo entrar como invitado.");
      return;
    }

    router.push("/feed");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />o
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <button
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        disabled={pending}
        onClick={handleGuest}
        type="button"
      >
        {pending ? "Entrando…" : "Entrar como invitado"}
      </button>
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
