"use client";

// Gestión de canales (Fase 10b) — SOLO ADMIN (gate en servidor).
//
// Consume las Server Actions de `src/server/admin/channels.ts`:
//   listAllChannels (refetch), createChannel, updateChannel,
//   archiveChannel / unarchiveChannel.
// Validación cliente con los MISMOS esquemas zod del servidor (espejo): el
// servidor es la fuente de verdad y re-valida + comprueba slug único.

import { useId, useState, useTransition } from "react";
import { ArchiveIcon, HashIcon, PlusIcon } from "@/components/feed/icons";
import { cn } from "@/lib/utils";
import {
  createChannelSchema,
  updateChannelSchema,
} from "@/lib/validations/admin";
import {
  type AdminChannel,
  archiveChannel,
  createChannel,
  listAllChannels,
  unarchiveChannel,
  updateChannel,
} from "@/server/admin/channels";

type ChannelType = "DEPARTMENT" | "TOPIC";

const TYPE_LABEL: Record<ChannelType, string> = {
  DEPARTMENT: "Departamento",
  TOPIC: "Tema",
};

export function AdminChannelsManager({
  initialChannels,
}: {
  initialChannels: AdminChannel[];
}) {
  const [channels, setChannels] = useState(initialChannels);
  const [status, setStatus] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function refetch() {
    startTransition(async () => {
      const res = await listAllChannels();
      if (res.ok) setChannels(res.data);
    });
  }

  const active = channels.filter((c) => !c.archivedAt);
  const archived = channels.filter((c) => c.archivedAt);

  return (
    <div className="flex flex-col gap-6">
      <p aria-live="polite" className="sr-only" role="status">
        {status ?? ""}
      </p>

      <CreateChannelForm onCreated={refetch} onStatus={setStatus} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Canales activos ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay canales activos.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((c) => (
              <ChannelCard
                channel={c}
                key={c.id}
                onChanged={refetch}
                onStatus={setStatus}
              />
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Archivados ({archived.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {archived.map((c) => (
              <ChannelCard
                channel={c}
                key={c.id}
                onChanged={refetch}
                onStatus={setStatus}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function CreateChannelForm({
  onCreated,
  onStatus,
}: {
  onCreated: () => void;
  onStatus: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ChannelType>("TOPIC");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ids = {
    name: useId(),
    slug: useId(),
    desc: useId(),
    type: useId(),
  };

  function reset() {
    setName("");
    setSlug("");
    setDescription("");
    setType("TOPIC");
    setError(null);
  }

  function submit() {
    setError(null);
    const parsed = createChannelSchema.safeParse({
      name,
      slug,
      description: description.trim() || undefined,
      type,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos no válidos.");
      return;
    }
    startTransition(async () => {
      const res = await createChannel(parsed.data);
      if (!res.ok) {
        setError(res.error.fieldErrors?.slug?.[0] ?? res.error.message);
        return;
      }
      onStatus(`Canal "${name}" creado.`);
      reset();
      setOpen(false);
      onCreated();
    });
  }

  if (!open) {
    return (
      <button
        className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
        onClick={() => setOpen(true)}
        type="button"
      >
        <PlusIcon className="size-4" />
        Nuevo canal
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 className="text-sm font-semibold text-foreground">Nuevo canal</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label
          className="flex flex-col gap-1 text-xs font-medium text-foreground"
          htmlFor={ids.name}
        >
          Nombre
          <input
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-normal text-foreground outline-none focus:border-brand"
            id={ids.name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
        </label>
        <label
          className="flex flex-col gap-1 text-xs font-medium text-foreground"
          htmlFor={ids.slug}
        >
          Slug (no editable luego)
          <input
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 font-mono text-sm font-normal text-foreground outline-none focus:border-brand"
            id={ids.slug}
            maxLength={60}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
            }
            placeholder="ej. recursos-humanos"
            value={slug}
          />
        </label>
      </div>
      <label
        className="flex flex-col gap-1 text-xs font-medium text-foreground"
        htmlFor={ids.desc}
      >
        Descripción (opcional)
        <textarea
          className="min-h-16 resize-y rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-normal text-foreground outline-none focus:border-brand"
          id={ids.desc}
          maxLength={500}
          onChange={(e) => setDescription(e.target.value)}
          value={description}
        />
      </label>
      <label
        className="flex flex-col gap-1 text-xs font-medium text-foreground"
        htmlFor={ids.type}
      >
        Tipo
        <select
          className="w-48 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-normal text-foreground outline-none focus:border-brand"
          id={ids.type}
          onChange={(e) => setType(e.target.value as ChannelType)}
          value={type}
        >
          <option value="TOPIC">Tema</option>
          <option value="DEPARTMENT">Departamento</option>
        </select>
      </label>

      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Creando…" : "Crear canal"}
        </button>
        <button
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-surface-muted"
          disabled={pending}
          onClick={() => {
            reset();
            setOpen(false);
          }}
          type="button"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function ChannelCard({
  channel,
  onChanged,
  onStatus,
}: {
  channel: AdminChannel;
  onChanged: () => void;
  onStatus: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description ?? "");
  const [type, setType] = useState<ChannelType>(channel.type);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ids = { name: useId(), desc: useId(), type: useId() };
  const isArchived = Boolean(channel.archivedAt);

  function saveEdit() {
    setError(null);
    const parsed = updateChannelSchema.safeParse({
      id: channel.id,
      name,
      description: description.trim() || null,
      type,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos no válidos.");
      return;
    }
    startTransition(async () => {
      const res = await updateChannel(channel.id, {
        name,
        description: description.trim() || null,
        type,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      onStatus(`Canal "${name}" actualizado.`);
      setEditing(false);
      onChanged();
    });
  }

  function toggleArchive() {
    startTransition(async () => {
      const res = isArchived
        ? await unarchiveChannel(channel.id)
        : await archiveChannel(channel.id);
      if (!res.ok) {
        onStatus(res.error.message);
        return;
      }
      onStatus(
        isArchived
          ? `Canal "${channel.name}" desarchivado.`
          : `Canal "${channel.name}" archivado.`,
      );
      onChanged();
    });
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-col gap-3">
          <label
            className="flex flex-col gap-1 text-xs font-medium text-foreground"
            htmlFor={ids.name}
          >
            Nombre
            <input
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-normal text-foreground outline-none focus:border-brand"
              id={ids.name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              value={name}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Slug (no editable)
            <input
              className="cursor-not-allowed rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 font-mono text-sm font-normal text-muted-foreground"
              disabled
              value={channel.slug}
            />
          </label>
          <label
            className="flex flex-col gap-1 text-xs font-medium text-foreground"
            htmlFor={ids.desc}
          >
            Descripción
            <textarea
              className="min-h-16 resize-y rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-normal text-foreground outline-none focus:border-brand"
              id={ids.desc}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
              value={description}
            />
          </label>
          <label
            className="flex flex-col gap-1 text-xs font-medium text-foreground"
            htmlFor={ids.type}
          >
            Tipo
            <select
              className="w-48 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-normal text-foreground outline-none focus:border-brand"
              id={ids.type}
              onChange={(e) => setType(e.target.value as ChannelType)}
              value={type}
            >
              <option value="TOPIC">Tema</option>
              <option value="DEPARTMENT">Departamento</option>
            </select>
          </label>
          {error ? (
            <p
              className="text-xs text-rose-600 dark:text-rose-400"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-50"
              disabled={pending}
              onClick={saveEdit}
              type="button"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-surface-muted"
              disabled={pending}
              onClick={() => {
                setName(channel.name);
                setDescription(channel.description ?? "");
                setType(channel.type);
                setError(null);
                setEditing(false);
              }}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-4",
        isArchived && "opacity-70",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <HashIcon className="size-3.5 text-muted-foreground" />
            {channel.name}
          </span>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {TYPE_LABEL[channel.type]}
          </span>
          {isArchived ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              Archivado
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          /{channel.slug} · {channel.postCount}{" "}
          {channel.postCount === 1 ? "post" : "posts"}
        </p>
        {channel.description ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {channel.description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {!isArchived ? (
          <button
            className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-50"
            disabled={pending}
            onClick={() => setEditing(true)}
            type="button"
          >
            Editar
          </button>
        ) : null}
        <button
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
          disabled={pending}
          onClick={toggleArchive}
          type="button"
        >
          <ArchiveIcon className="size-3.5" />
          {isArchived ? "Desarchivar" : "Archivar"}
        </button>
      </div>
    </li>
  );
}
