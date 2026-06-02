"use client";

// Página de CAMBIO DE CONTRASEÑA (R2) — migrada al sistema de diseño.
//
// Coherente con el login: tarjeta centrada del layout `(auth)`, inputs/botones
// shadcn, tokens de marca. Cubre dos casos:
//   - el cambio FORZADO del primer login (cuentas dadas de alta por la empresa,
//     que llegan aquí con `mustChangePassword=true` desde el gate de `(app)`),
//   - un cambio voluntario.
// Tras el cambio, el gate de `(app)/layout.tsx` deja pasar (mustChangePassword
// queda en false) y enviamos al feed.

import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordSchema } from "@/lib/validations/auth";
import { changeOwnPassword } from "@/server/account";

export default function ChangePasswordPage() {
  const router = useRouter();
  const currentId = useId();
  const newId = useId();
  const confirmId = useId();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    // Confirmación: espejo en cliente (el servidor no la necesita).
    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Las contraseñas no coinciden." });
      return;
    }

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
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
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Cambia tu contraseña
        </h1>
        <p className="text-sm text-muted-foreground">
          Por seguridad, establece una contraseña nueva antes de continuar.
        </p>
      </header>

      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={currentId}>Contraseña actual</Label>
          <Input
            aria-describedby={
              fieldErrors.currentPassword ? `${currentId}-error` : undefined
            }
            aria-invalid={Boolean(fieldErrors.currentPassword)}
            autoComplete="current-password"
            id={currentId}
            name="currentPassword"
            type="password"
          />
          {fieldErrors.currentPassword ? (
            <p className="text-xs text-danger" id={`${currentId}-error`}>
              {fieldErrors.currentPassword}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={newId}>Nueva contraseña</Label>
          <Input
            aria-describedby={
              fieldErrors.newPassword ? `${newId}-error` : undefined
            }
            aria-invalid={Boolean(fieldErrors.newPassword)}
            autoComplete="new-password"
            id={newId}
            name="newPassword"
            type="password"
          />
          {fieldErrors.newPassword ? (
            <p className="text-xs text-danger" id={`${newId}-error`}>
              {fieldErrors.newPassword}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={confirmId}>Repite la nueva contraseña</Label>
          <Input
            aria-describedby={
              fieldErrors.confirmPassword ? `${confirmId}-error` : undefined
            }
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            autoComplete="new-password"
            id={confirmId}
            name="confirmPassword"
            type="password"
          />
          {fieldErrors.confirmPassword ? (
            <p className="text-xs text-danger" id={`${confirmId}-error`}>
              {fieldErrors.confirmPassword}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p className="text-sm text-danger" role="alert">
            {formError}
          </p>
        ) : null}

        <Button className="w-full" disabled={pending} type="submit">
          {pending ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </div>
  );
}
