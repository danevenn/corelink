"use client";

// Selector de emojis para los compositores.
//
// - Botón icono que abre un Popover (shadcn/radix → foco gestionado, Escape
//   cierra, click-fuera cierra).
// - Pool CURADO cargado BAJO DEMANDA (fetch del JSON estático al abrir; no entra
//   en el bundle). Categorías + búsqueda por nombre/keyword.
// - Los emojis se muestran ya como SVG de OpenMoji (coherencia con el render).
// - Rejilla navegable por teclado (flechas + Enter), accesible (role=grid).
// - Al elegir uno NO cierra el popover (permite encadenar varios); el padre
//   inserta el carácter Unicode en la posición del cursor del textarea.

import { Search, SmilePlus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type EmojiPool,
  filterPool,
  loadEmojiPool,
  type PoolEmoji,
} from "@/lib/emoji-pool";
import { cn } from "@/lib/utils";
import { EmojiImg } from "./emoji-img";

type Props = {
  /** Inserta el carácter emoji elegido (el padre lo coloca en el cursor). */
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  /** Tamaño/estilo del botón disparador. */
  variant?: "default" | "icon";
};

export function EmojiPicker({
  onSelect,
  disabled,
  variant = "default",
}: Props) {
  const [open, setOpen] = useState(false);
  const [pool, setPool] = useState<EmojiPool | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Carga perezosa del pool la PRIMERA vez que se abre.
  useEffect(() => {
    if (!open || pool) return;
    let alive = true;
    loadEmojiPool()
      .then((p) => alive && setPool(p))
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, [open, pool]);

  const categories = useMemo(
    () => (pool ? filterPool(pool, query) : []),
    [pool, query],
  );

  // Lista plana en orden visual para navegación por teclado.
  const flat = useMemo(() => categories.flatMap((c) => c.items), [categories]);

  const handleSelect = useCallback(
    (emoji: string) => {
      onSelect(emoji);
      // No cerramos: el usuario puede encadenar emojis.
    },
    [onSelect],
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-label="Insertar emoji"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:cursor-not-allowed disabled:opacity-50",
            variant === "icon" ? "size-10" : "size-9",
          )}
          disabled={disabled}
          type="button"
        >
          <SmilePlus className="size-5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        aria-label="Selector de emojis"
        className="w-[min(22rem,calc(100vw-2rem))] p-0"
        // Devuelve el foco al disparador al cerrar; bueno para teclado.
        onOpenAutoFocus={(e) => {
          // Enfoca el buscador al abrir en vez del primer emoji.
          e.preventDefault();
          searchRef.current?.focus();
        }}
        sideOffset={8}
      >
        <SearchBox
          id={searchId}
          onChange={setQuery}
          ref={(el) => {
            searchRef.current = el;
          }}
          value={query}
        />
        <div className="max-h-[18rem] overflow-y-auto overscroll-contain p-2">
          {loadError ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No se pudieron cargar los emojis. Inténtalo de nuevo.
            </p>
          ) : !pool ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Cargando emojis…
            </p>
          ) : flat.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Sin resultados para “{query}”.
            </p>
          ) : (
            <EmojiGrid categories={categories} onSelect={handleSelect} />
          )}
        </div>
        <p className="border-t border-border px-3 py-1.5 text-[10px] leading-tight text-muted-foreground">
          Emojis por OpenMoji (CC BY-SA 4.0)
        </p>
      </PopoverContent>
    </Popover>
  );
}

function SearchBox({
  id,
  value,
  onChange,
  ref,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  ref: (el: HTMLInputElement | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
      <Search
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <label className="sr-only" htmlFor={id}>
        Buscar emoji
      </label>
      <input
        autoComplete="off"
        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        id={id}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar emoji…"
        ref={ref}
        type="text"
        value={value}
      />
    </div>
  );
}

function EmojiGrid({
  categories,
  onSelect,
}: {
  categories: { id: string; label: string; items: PoolEmoji[] }[];
  onSelect: (emoji: string) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);

  // Navegación por teclado tipo rejilla: flechas mueven entre botones de emoji.
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = [
      "ArrowRight",
      "ArrowLeft",
      "ArrowDown",
      "ArrowUp",
      "Home",
      "End",
    ];
    if (!keys.includes(e.key)) return;
    const root = gridRef.current;
    if (!root) return;
    const buttons = Array.from(
      root.querySelectorAll<HTMLButtonElement>("button[data-emoji-cell]"),
    );
    const current = document.activeElement as HTMLButtonElement | null;
    const idx = current ? buttons.indexOf(current) : -1;
    if (idx === -1) return;
    e.preventDefault();
    // Columnas reales según el ancho renderizado (CSS grid auto-fill).
    const cols = computeColumns(root);
    let next = idx;
    if (e.key === "ArrowRight") next = Math.min(idx + 1, buttons.length - 1);
    else if (e.key === "ArrowLeft") next = Math.max(idx - 1, 0);
    else if (e.key === "ArrowDown")
      next = Math.min(idx + cols, buttons.length - 1);
    else if (e.key === "ArrowUp") next = Math.max(idx - cols, 0);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = buttons.length - 1;
    buttons[next]?.focus();
  }, []);

  return (
    // Contenedor simple: la navegación con flechas la gestiona nuestro onKeyDown
    // y cada emoji es un <button> nativo accesible. Sin role=grid (exigiría
    // hijos role=row/gridcell). El nombre accesible lo da el PopoverContent.
    // biome-ignore lint/a11y/noStaticElementInteractions: el onKeyDown solo redirige el foco entre botones ya accesibles; no añade interacción nueva.
    <div onKeyDown={onKeyDown} ref={gridRef}>
      {categories.map((cat) => (
        <section key={cat.id}>
          <h3 className="sticky top-0 bg-popover px-1 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {cat.label}
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))]">
            {cat.items.map((it) => (
              <button
                aria-label={it.n}
                className="grid aspect-square place-items-center rounded-lg p-1 transition hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                data-emoji-cell
                key={`${cat.id}-${it.h}`}
                onClick={() => onSelect(it.e)}
                title={it.n}
                type="button"
              >
                <EmojiImg className="h-7 w-7" emoji={it.e} label={it.n} />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Nº de columnas reales de la rejilla CSS (para mover arriba/abajo). */
function computeColumns(root: HTMLElement): number {
  const grid = root.querySelector<HTMLElement>(".grid");
  if (!grid) return 1;
  const style = getComputedStyle(grid);
  const cols = style.gridTemplateColumns.split(" ").filter(Boolean).length;
  return Math.max(cols, 1);
}
