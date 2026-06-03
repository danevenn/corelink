"use client";

// Dropdown de resultados del autocompletado de @menciones.
//
// Presentacional: recibe el estado del hook `useMentionAutocomplete` y lo pinta
// como un listbox accesible anclado al compositor (posición absoluta sobre el
// textarea). El foco PERMANECE en el textarea; la navegación es por
// `aria-activedescendant` (patrón combobox), con clic alternativo.
//
// El contenedor (el compositor) debe ser `relative` para anclar el panel.
// `mousedown.preventDefault` en las opciones evita que el textarea pierda el
// foco al hacer clic (el `click` aún se dispara y elige el usuario).

import { Avatar } from "@/components/feed/avatar";
import type { MentionAutocompleteState } from "@/hooks/use-mention-autocomplete";
import { cn } from "@/lib/utils";

type Props = {
  /** Estado del hook compartido. */
  ac: MentionAutocompleteState;
  /** Ancla vertical: encima del textarea (composer chat) o debajo. */
  placement?: "top" | "bottom";
};

export function MentionAutocomplete({ ac, placement = "bottom" }: Props) {
  if (!ac.open) return null;

  const active = ac.results[ac.activeIndex];

  return (
    <div
      className={cn(
        "absolute left-0 z-30 w-[min(20rem,calc(100%-0.5rem))]",
        placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
      )}
    >
      {/* Anuncio para lectores de pantalla: nº de sugerencias + la activa. El
          textarea conserva su rol de textbox (combobox no es válido sobre un
          textarea multilínea), así que el feedback se da por una región viva en
          lugar de aria-activedescendant. */}
      <span aria-live="polite" className="sr-only" role="status">
        {ac.results.length} sugerencias.
        {active ? ` ${active.displayName} seleccionada.` : ""}
      </span>
      {/* Lista visual: la navegan las flechas del textbox (gestionadas por el
          hook), no el Tab; usamos <div role> para no implicar navegación nativa
          de listas y mantener axe/biome en 0. */}
      <div
        aria-label="Sugerencias de menciones"
        className="max-h-64 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-popover p-1 shadow-soft"
        id={ac.listboxId}
        role="listbox"
      >
        {ac.results.map((user, i) => {
          const active = i === ac.activeIndex;
          return (
            // biome-ignore lint/a11y/useFocusableInteractive: en aria-activedescendant las opciones NO son focusables; el foco vive en el textbox.
            // biome-ignore lint/a11y/useKeyWithClickEvents: el teclado lo gestiona el textbox asociado (hook); el click es solo un atajo de ratón.
            <div
              aria-selected={active}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition",
                active ? "bg-brand-soft" : "hover:bg-surface-muted",
              )}
              id={ac.optionId(i)}
              key={user.id}
              // Evita robar el foco al textarea; el click sigue eligiendo.
              onClick={() => ac.select(user)}
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => ac.setActiveIndex(i)}
              role="option"
            >
              <Avatar
                name={user.displayName}
                seed={user.id}
                size="sm"
                src={user.avatarUrl}
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">
                  {user.displayName}
                </span>
                {user.jobTitle ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {user.jobTitle}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
