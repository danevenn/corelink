"use client";

// Botón "Nuevo" en la cabecera de la lista: abre un selector para iniciar un DM
// o crear un grupo. Busca usuarios con `searchUsers` (debounced), arma la
// selección y llama a las acciones de servidor; al crear, navega a la conv.

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { Avatar } from "@/components/feed/avatar";
import { PlusIcon } from "@/components/feed/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createGroupConversation,
  getOrCreateDirectConversation,
  searchUsersAction,
} from "@/server/chat-actions";
import type { UserSearchResult } from "@/server/search";

type Mode = "closed" | "direct" | "group";

export function NewConversationMenu() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("closed");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  const groupNameId = useId();

  const close = useCallback(() => {
    setMode("closed");
    setQuery("");
    setResults([]);
    setSelected([]);
    setGroupName("");
    setError(null);
  }, []);

  // Búsqueda debounced.
  useEffect(() => {
    if (mode === "closed") return;
    const q = query.trim();
    if (q.length === 0) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      void searchUsersAction(q).then((users) =>
        setResults(users.filter((u) => !u.isSelf)),
      );
    }, 220);
    return () => clearTimeout(t);
  }, [query, mode]);

  // Cerrar con Escape / clic fuera.
  useEffect(() => {
    if (mode === "closed") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    function onClick(e: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [mode, close]);

  const startDirect = useCallback(
    (user: UserSearchResult) => {
      setError(null);
      startTransition(async () => {
        const res = await getOrCreateDirectConversation({
          otherUserId: user.userId,
        });
        if (res.ok) {
          close();
          router.push(`/messages/${res.data.conversationId}`);
        } else {
          setError(res.error.message);
        }
      });
    },
    [router, close],
  );

  const toggleSelect = useCallback((user: UserSearchResult) => {
    setSelected((prev) =>
      prev.some((u) => u.userId === user.userId)
        ? prev.filter((u) => u.userId !== user.userId)
        : [...prev, user],
    );
  }, []);

  const createGroup = useCallback(() => {
    setError(null);
    if (groupName.trim().length === 0) {
      setError("Pon un nombre al grupo.");
      return;
    }
    if (selected.length === 0) {
      setError("Añade al menos un miembro.");
      return;
    }
    startTransition(async () => {
      const res = await createGroupConversation({
        name: groupName.trim(),
        memberIds: selected.map((u) => u.userId),
      });
      if (res.ok) {
        close();
        router.push(`/messages/${res.data.conversationId}`);
      } else {
        setError(res.error.message);
      }
    });
  }, [groupName, selected, router, close]);

  return (
    <div className="relative">
      <button
        aria-haspopup="dialog"
        aria-label="Nueva conversación"
        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
        onClick={() => setMode("direct")}
        type="button"
      >
        <PlusIcon className="size-4" />
      </button>

      {mode !== "closed" ? (
        <>
          {/* Backdrop: captura clics fuera y aísla el fondo en móvil. Es `fixed`
              a propósito —así el diálogo escapa del `overflow-hidden` del shell
              de /messages, que antes recortaba el popover `absolute` y lo
              descolocaba en móvil. */}
          <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/40" />
          <div
            aria-label="Nueva conversación"
            aria-modal="true"
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[85dvh] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated"
            ref={dialogRef}
            role="dialog"
          >
            <div className="flex shrink-0 border-b border-border">
              <button
                className={cn(
                  "flex-1 px-3 py-2.5 text-sm font-medium transition",
                  mode === "direct"
                    ? "bg-brand-soft text-brand"
                    : "text-muted-foreground hover:bg-surface-muted",
                )}
                onClick={() => setMode("direct")}
                type="button"
              >
                Mensaje directo
              </button>
              <button
                className={cn(
                  "flex-1 px-3 py-2.5 text-sm font-medium transition",
                  mode === "group"
                    ? "bg-brand-soft text-brand"
                    : "text-muted-foreground hover:bg-surface-muted",
                )}
                onClick={() => setMode("group")}
                type="button"
              >
                Nuevo grupo
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
              {mode === "group" ? (
                <div className="flex flex-col gap-1">
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor={groupNameId}
                  >
                    Nombre del grupo
                  </label>
                  <Input
                    id={groupNameId}
                    maxLength={100}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="p.ej. Proyecto CoreLink"
                    value={groupName}
                  />
                </div>
              ) : null}

              {mode === "group" && selected.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((u) => (
                    <button
                      className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand"
                      key={u.userId}
                      onClick={() => toggleSelect(u)}
                      type="button"
                    >
                      {u.displayName}
                      <span aria-hidden="true">×</span>
                      <span className="sr-only">Quitar</span>
                    </button>
                  ))}
                </div>
              ) : null}

              <Input
                aria-label="Buscar personas"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar personas…"
                type="search"
                value={query}
              />

              <div className="max-h-56 overflow-y-auto">
                {results.length === 0 && query.trim().length > 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                    Sin resultados.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {results.map((u) => {
                      const isSelected = selected.some(
                        (s) => s.userId === u.userId,
                      );
                      return (
                        <li key={u.userId}>
                          <button
                            aria-pressed={
                              mode === "group" ? isSelected : undefined
                            }
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-surface-muted",
                              isSelected && "bg-brand-soft",
                            )}
                            disabled={pending}
                            onClick={() =>
                              mode === "group"
                                ? toggleSelect(u)
                                : startDirect(u)
                            }
                            type="button"
                          >
                            <Avatar
                              name={u.displayName}
                              seed={u.userId}
                              size="sm"
                              src={u.avatarUrl}
                            />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-sm font-medium text-foreground">
                                {u.displayName}
                              </span>
                              {u.jobTitle ? (
                                <span className="truncate text-xs text-muted-foreground">
                                  {u.jobTitle}
                                </span>
                              ) : null}
                            </span>
                            {mode === "group" && isSelected ? (
                              <span className="text-xs font-bold text-brand">
                                ✓
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {error ? (
                <p className="text-xs text-danger" role="alert">
                  {error}
                </p>
              ) : null}

              {mode === "group" ? (
                <Button disabled={pending} onClick={createGroup} type="button">
                  {pending ? "Creando…" : "Crear grupo"}
                </Button>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
