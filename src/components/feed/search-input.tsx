"use client";

// Barra de búsqueda de la cabecera (Fase 6c). Island ligero: navega a la página
// de resultados server-rendered `/search?q=...` al enviar el formulario.
//
// Decisión UX: resultados en página dedicada (Server Component) — simple, robusto
// y compartible por URL — en lugar de búsqueda incremental con debounce. El input
// es un <form>, así que funciona con Enter y sin JS adicional.

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "./icons";

export function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Prefill cuando ya estamos en /search?q=… (la cabecera persiste entre rutas).
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = value.trim();
    if (q.length === 0) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <search className="hidden sm:block">
      <form className="relative" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="site-search">
          Buscar publicaciones y personas
        </label>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          autoComplete="off"
          className="w-40 rounded-full border border-border bg-surface-muted py-1.5 pl-8 pr-3 text-sm text-foreground outline-none transition focus:w-56 focus:border-brand focus:bg-surface"
          id="site-search"
          name="q"
          onChange={(e) => setValue(e.target.value)}
          placeholder="Buscar…"
          type="search"
          value={value}
        />
      </form>
    </search>
  );
}
