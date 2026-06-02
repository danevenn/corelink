"use client";

// Alta de empleados (R2) — diálogo accesible que consume `createEmployee`.
//
// Reglas de rol (espejo del servidor, que es la fuente de verdad):
//   - El select de rol NUNCA ofrece `admin` (crear admins no va por esta vía).
//   - Si el viewer es MODERADOR, solo puede crear `user` (el servidor rechaza
//     que un moderador cree `moderator`); por eso ni siquiera mostramos esa
//     opción cuando `viewerIsAdmin` es false.
//   - Departamento opcional: un canal de tipo DEPARTMENT.
//   - Contraseña temporal autogenerada por defecto; se puede escribir una.
//
// Al éxito mostramos la contraseña temporal UNA vez, con botón de copiar y
// aviso de que el empleado deberá cambiarla en su primer acceso. La fila nueva
// se refleja en la tabla vía el callback `onCreated` (refresco optimista).

import { CheckIcon, CopyIcon, KeyRoundIcon, UserPlusIcon } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEmployeeSchema } from "@/lib/validations/admin";
import { type CreatedEmployee, createEmployee } from "@/server/admin/users";

type DepartmentOption = { id: string; name: string };

type Props = {
  /** ¿El viewer es admin? Si no, solo puede crear `user` (regla del servidor). */
  viewerIsAdmin: boolean;
  /** Canales DEPARTMENT no archivados para el select opcional de departamento. */
  departments: DepartmentOption[];
  /** Refresca la tabla tras crear (la action revalida `/admin`). */
  onCreated: () => void;
};

type Role = "user" | "moderator";

export function CreateEmployeeDialog({
  viewerIsAdmin,
  departments,
  onCreated,
}: Props) {
  const [open, setOpen] = useState(false);

  // Cuando se cierra el diálogo, reseteamos el resultado para no filtrar la
  // contraseña en una próxima apertura. El estado vive en el formulario interno,
  // re-montado por `key` al abrir.
  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlusIcon aria-hidden="true" />
          Dar de alta empleado
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl border-border bg-surface sm:max-w-md">
        {open ? (
          <CreateEmployeeForm
            departments={departments}
            key={String(open)}
            onClose={() => setOpen(false)}
            onCreated={onCreated}
            viewerIsAdmin={viewerIsAdmin}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateEmployeeForm({
  viewerIsAdmin,
  departments,
  onCreated,
  onClose,
}: {
  viewerIsAdmin: boolean;
  departments: DepartmentOption[];
  onCreated: () => void;
  onClose: () => void;
}) {
  const ids = {
    email: useId(),
    name: useId(),
    role: useId(),
    dept: useId(),
    pwd: useId(),
  };

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [autoPassword, setAutoPassword] = useState(true);
  const [manualPassword, setManualPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedEmployee | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setFormError(null);
    setFieldErrors({});

    const candidate = {
      email,
      name,
      role,
      ...(departmentId ? { departmentId } : {}),
      ...(autoPassword ? {} : { temporaryPassword: manualPassword }),
    };

    const parsed = createEmployeeSchema.safeParse(candidate);
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

    startTransition(async () => {
      const res = await createEmployee(parsed.data);
      if (!res.ok) {
        if (res.error.fieldErrors) {
          const errors: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(res.error.fieldErrors)) {
            if (msgs?.[0]) errors[key] = msgs[0];
          }
          setFieldErrors(errors);
        }
        setFormError(res.error.message);
        return;
      }
      setCreated(res.data);
      onCreated();
    });
  }

  // ── Pantalla de ÉXITO: muestra la contraseña temporal UNA vez ──────────────
  if (created) {
    return <CreatedResult employee={created} onClose={onClose} />;
  }

  // ── Formulario ─────────────────────────────────────────────────────────────
  return (
    <>
      <DialogHeader>
        <DialogTitle>Dar de alta empleado</DialogTitle>
        <DialogDescription>
          Crea una cuenta de empresa. Recibirá una contraseña temporal que
          deberá cambiar en su primer acceso.
        </DialogDescription>
      </DialogHeader>

      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.name}>Nombre completo</Label>
          <Input
            aria-invalid={Boolean(fieldErrors.name)}
            autoComplete="off"
            id={ids.name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Marta López"
            value={name}
          />
          {fieldErrors.name ? (
            <p className="text-xs text-danger">{fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.email}>Correo electrónico</Label>
          <Input
            aria-invalid={Boolean(fieldErrors.email)}
            autoComplete="off"
            id={ids.email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="marta.lopez@corelink.demo"
            type="email"
            value={email}
          />
          {fieldErrors.email ? (
            <p className="text-xs text-danger">{fieldErrors.email}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.role}>Rol</Label>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
              id={ids.role}
              onChange={(e) => setRole(e.target.value as Role)}
              value={role}
            >
              <option value="user">Usuario</option>
              {/* Solo un admin puede dar de alta moderadores (regla servidor). */}
              {viewerIsAdmin ? (
                <option value="moderator">Moderador</option>
              ) : null}
            </select>
            {fieldErrors.role ? (
              <p className="text-xs text-danger">{fieldErrors.role}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.dept}>Departamento (opcional)</Label>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
              disabled={departments.length === 0}
              id={ids.dept}
              onChange={(e) => setDepartmentId(e.target.value)}
              value={departmentId}
            >
              <option value="">Sin departamento</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="flex flex-col gap-2 rounded-xl border border-border bg-surface-muted/40 p-3">
          <legend className="px-1 text-xs font-semibold text-muted-foreground">
            Contraseña temporal
          </legend>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              checked={autoPassword}
              className="size-4 accent-[var(--brand)]"
              name="pwd-mode"
              onChange={() => setAutoPassword(true)}
              type="radio"
            />
            Generar automáticamente (recomendado)
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              checked={!autoPassword}
              className="size-4 accent-[var(--brand)]"
              name="pwd-mode"
              onChange={() => setAutoPassword(false)}
              type="radio"
            />
            Escribir una manualmente
          </label>
          {!autoPassword ? (
            <div className="mt-1 flex flex-col gap-1.5">
              <Label className="sr-only" htmlFor={ids.pwd}>
                Contraseña temporal
              </Label>
              <Input
                aria-invalid={Boolean(fieldErrors.temporaryPassword)}
                autoComplete="off"
                id={ids.pwd}
                onChange={(e) => setManualPassword(e.target.value)}
                placeholder="Mínimo 12 caracteres"
                type="text"
                value={manualPassword}
              />
              {fieldErrors.temporaryPassword ? (
                <p className="text-xs text-danger">
                  {fieldErrors.temporaryPassword}
                </p>
              ) : null}
            </div>
          ) : null}
        </fieldset>

        {formError ? (
          <p className="text-sm text-danger" role="alert">
            {formError}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            disabled={pending}
            onClick={onClose}
            type="button"
            variant="ghost"
          >
            Cancelar
          </Button>
          <Button disabled={pending} type="submit">
            {pending ? "Creando…" : "Crear empleado"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function CreatedResult({
  employee,
  onClose,
}: {
  employee: CreatedEmployee;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(employee.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-success-soft text-success">
            <CheckIcon aria-hidden="true" className="size-4" />
          </span>
          Empleado creado
        </DialogTitle>
        <DialogDescription>
          La cuenta de{" "}
          <strong className="text-foreground">{employee.email}</strong> está
          lista. Comparte esta contraseña temporal de forma segura: solo se
          muestra una vez.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-muted/50 p-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <KeyRoundIcon aria-hidden="true" className="size-3.5" />
          Contraseña temporal
        </span>
        <div className="flex items-center gap-2">
          <code className="flex-1 select-all break-all rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground">
            {employee.temporaryPassword}
          </code>
          <Button
            aria-label="Copiar contraseña temporal"
            onClick={copy}
            size="icon"
            type="button"
            variant="outline"
          >
            {copied ? (
              <CheckIcon aria-hidden="true" />
            ) : (
              <CopyIcon aria-hidden="true" />
            )}
          </Button>
        </div>
        {/* Confirmación de copia para lectores de pantalla. */}
        <p aria-live="polite" className="sr-only" role="status">
          {copied ? "Contraseña copiada al portapapeles." : ""}
        </p>
      </div>

      <p className="rounded-xl bg-official-soft px-3 py-2 text-xs text-official">
        El empleado deberá cambiar esta contraseña en su primer acceso.
      </p>

      <DialogFooter>
        <Button onClick={onClose} type="button">
          Hecho
        </Button>
      </DialogFooter>
    </>
  );
}
