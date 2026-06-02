"use client";

// Página de CAMBIO DE CONTRASEÑA (R1) — funcional, SIN pulir.
//
// El rediseño visual lo hará frontend-ui (R2). Aquí solo dejamos un formulario
// accesible y funcional para:
//   - el cambio FORZADO del primer login (cuentas dadas de alta por la empresa),
//   - un cambio voluntario.
// Tras el cambio, el gate de `(app)/layout.tsx` deja pasar (mustChangePassword
// queda en false) y enviamos al feed.

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { changePasswordSchema } from "@/lib/validations/auth";
import { changeOwnPassword } from "@/server/account";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
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
    const result = await changeOwnPassword(parsed.data);
    setPending(false);

    if (!result.ok) {
      setFormError(result.error.message);
      if (result.error.fieldErrors) {
        const errors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(result.error.fieldErrors)) {
          if (msgs?.[0]) errors[key] = msgs[0];
        }
        setFieldErrors(errors);
      }
      return;
    }

    router.push("/feed");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Cambia tu contraseña
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Por seguridad, establece una contraseña nueva antes de continuar.
        </p>
      </header>

      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            htmlFor="currentPassword"
          >
            Contraseña actual
          </label>
          <input
            autoComplete="current-password"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400"
            id="currentPassword"
            name="currentPassword"
            type="password"
          />
          {fieldErrors.currentPassword ? (
            <p className="text-xs text-red-600 dark:text-red-400">
              {fieldErrors.currentPassword}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            htmlFor="newPassword"
          >
            Nueva contraseña
          </label>
          <input
            autoComplete="new-password"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400"
            id="newPassword"
            name="newPassword"
            type="password"
          />
          {fieldErrors.newPassword ? (
            <p className="text-xs text-red-600 dark:text-red-400">
              {fieldErrors.newPassword}
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
          {pending ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
