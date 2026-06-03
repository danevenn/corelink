// Tipos y carga BAJO DEMANDA del pool curado de emojis para el selector.
//
// El JSON (~58 KB) NO se importa en el bundle: se hace `fetch` de
// `/emoji/emoji-pool.json` (estático) la primera vez que se abre un picker y
// se cachea en memoria para el resto de la sesión. Así el coste no entra en
// la carga inicial de la app.

/** Un emoji del pool curado. Claves cortas para minimizar el JSON. */
export type PoolEmoji = {
  /** hexcode del emoji; solo se usa como clave estable de lista en el render. */
  h: string;
  /** Carácter emoji Unicode (lo que se inserta en el textarea). */
  e: string;
  /** Nombre/annotation en inglés (accesibilidad + búsqueda). */
  n: string;
  /** Palabras clave normalizadas (búsqueda). */
  k: string;
};

export type PoolCategory = {
  id: string;
  label: string;
  items: PoolEmoji[];
};

export type EmojiPool = {
  categories: PoolCategory[];
};

let cache: EmojiPool | null = null;
let inflight: Promise<EmojiPool> | null = null;

/** Carga (una vez) y cachea el pool curado de emojis. */
export async function loadEmojiPool(): Promise<EmojiPool> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = fetch("/emoji/emoji-pool.json", { cache: "force-cache" })
    .then((r) => {
      if (!r.ok)
        throw new Error(`No se pudo cargar el pool de emojis (${r.status})`);
      return r.json() as Promise<EmojiPool>;
    })
    .then((data) => {
      cache = data;
      inflight = null;
      return data;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });
  return inflight;
}

/** Filtra el pool por término de búsqueda (nombre + keywords). Sin término, todo. */
export function filterPool(pool: EmojiPool, query: string): PoolCategory[] {
  const q = query.trim().toLowerCase();
  if (!q) return pool.categories;
  return pool.categories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((it) => it.n.includes(q) || it.k.includes(q)),
    }))
    .filter((cat) => cat.items.length > 0);
}
