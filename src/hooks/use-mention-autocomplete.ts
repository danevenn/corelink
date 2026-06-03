"use client";

// Hook compartido del autocompletado de @menciones para los 3 compositores
// (post, respuesta, chat). DRY: el textarea y su estado los posee el padre; el
// hook solo observa el valor + la posición del cursor y devuelve:
//   - lo que hay que renderizar (resultados, índice activo, posición),
//   - los handlers a conectar al textarea (`onChange`, `onKeyDown`, `onSelect`).
//
// Detección: busca hacia atrás desde el cursor una `@` que abra "query" (palabra
// sin espacios ni saltos), precedida de inicio/espacio/salto (no de un carácter
// de palabra → así "email@x" NO dispara). El query es el texto entre la `@` y
// el cursor. Vacío justo tras `@` también dispara (muestra primeros resultados).
//
// Búsqueda: server action `searchMentionableUsersAction`, DEBOUNCED (180 ms),
// con cancelación de respuestas obsoletas (guarda de "última petición"). En chat
// se pasa el `conversationId` para restringir a miembros.
//
// Inserción: reemplaza el tramo `@query` por el token `@[displayName](userId) `
// (con espacio final), recoloca el cursor tras el espacio y mantiene el foco.
//
// Limpieza: el timer del debounce se cancela en cada cambio y al desmontar; el
// guard de petición evita setState tras desmontar.

import {
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { buildMentionToken } from "@/lib/mention-token";
import { searchMentionableUsersAction } from "@/server/mention-actions";
import type { MentionableUser } from "@/server/mentions";

const DEBOUNCE_MS = 180;
const MAX_QUERY = 60;

/** `@` seguida de "query" (sin espacios) hasta el cursor; al final del prefijo. */
const TRIGGER_RE = /(^|[\s\n])@([^\s@]*)$/;

type TriggerMatch = {
  /** Índice del carácter `@` en el valor completo. */
  atIndex: number;
  /** Texto entre la `@` y el cursor (puede ser ""). */
  query: string;
};

/** Detecta un trigger de mención mirando el texto a la IZQUIERDA del cursor. */
function detectTrigger(value: string, caret: number): TriggerMatch | null {
  const left = value.slice(0, caret);
  const m = TRIGGER_RE.exec(left);
  if (!m) return null;
  const query = m[2] ?? "";
  if (query.length > MAX_QUERY) return null;
  // atIndex = posición de la `@` = fin del prefijo menos (query + "@").
  const atIndex = caret - query.length - 1;
  return { atIndex, query };
}

type Params = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  /** Aplica el nuevo valor + recoloca el cursor (lo posee el padre). */
  setValue: (next: string, caret: number) => void;
  /** En el chat, restringe los resultados a miembros de la conversación. */
  conversationId?: string;
};

export type MentionAutocompleteState = {
  open: boolean;
  results: MentionableUser[];
  activeIndex: number;
  /** Id del <li> activo para `aria-activedescendant`. */
  activeOptionId: string | undefined;
  /** Prefijo estable para los id de las opciones (combobox a11y). */
  listboxId: string;
  optionId: (index: number) => string;
  /** Conéctalo al `onKeyDown` del textarea (devuelve true si lo consumió). */
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  /** Llámalo tras CADA cambio del valor (con el caret ya actualizado). */
  onValueChange: (nextValue: string, caret: number) => void;
  /** Elige un usuario (clic o teclado) e inserta su token. */
  select: (user: MentionableUser) => void;
  /** Cierra el dropdown sin elegir. */
  close: () => void;
  setActiveIndex: (i: number) => void;
};

let listboxCounter = 0;

export function useMentionAutocomplete({
  textareaRef,
  value,
  setValue,
  conversationId,
}: Params): MentionAutocompleteState {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<MentionableUser[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Id estable del listbox para los atributos ARIA.
  const listboxIdRef = useRef<string>("");
  if (!listboxIdRef.current) {
    listboxCounter += 1;
    listboxIdRef.current = `mention-listbox-${listboxCounter}`;
  }
  const listboxId = listboxIdRef.current;

  // Trigger activo (atIndex/query) que estamos resolviendo, o null si cerrado.
  const triggerRef = useRef<TriggerMatch | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Token monotónico para descartar respuestas obsoletas / tras desmontar.
  const reqIdRef = useRef(0);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const close = useCallback(() => {
    triggerRef.current = null;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    // Invalida cualquier respuesta en vuelo.
    reqIdRef.current += 1;
    setOpen(false);
    setResults([]);
    setActiveIndex(0);
  }, []);

  const runSearch = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const myReq = reqIdRef.current + 1;
      reqIdRef.current = myReq;
      debounceRef.current = setTimeout(() => {
        void searchMentionableUsersAction({
          q: query,
          ...(conversationId ? { conversationId } : {}),
        }).then((users) => {
          // Descarta si: desmontado, petición superada, o trigger ya cerrado.
          if (!aliveRef.current) return;
          if (myReq !== reqIdRef.current) return;
          if (!triggerRef.current) return;
          setResults(users);
          setActiveIndex(0);
          setOpen(users.length > 0);
        });
      }, DEBOUNCE_MS);
    },
    [conversationId],
  );

  const onValueChange = useCallback(
    (nextValue: string, caret: number) => {
      const trigger = detectTrigger(nextValue, caret);
      if (!trigger) {
        if (triggerRef.current) close();
        return;
      }
      // Query vacío (justo tras "@") tampoco busca: esperamos ≥1 carácter para
      // no traer ruido, pero mantenemos el trigger "armado".
      triggerRef.current = trigger;
      if (trigger.query.length === 0) {
        // Mantén abierto el "armado" pero sin resultados hasta teclear.
        reqIdRef.current += 1;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setOpen(false);
        setResults([]);
        return;
      }
      runSearch(trigger.query);
    },
    [close, runSearch],
  );

  const select = useCallback(
    (user: MentionableUser) => {
      const trigger = triggerRef.current;
      const el = textareaRef.current;
      if (!trigger) return;
      const token = `${buildMentionToken(user.displayName, user.id)} `;
      // Reemplaza exactamente [atIndex, atIndex + 1 + query.length) por el token.
      const caretNow = el?.selectionStart ?? value.length;
      const replaceEnd = trigger.atIndex + 1 + trigger.query.length;
      // Usa el fin real solo si coincide con lo esperado (cursor no movido).
      const end = caretNow >= trigger.atIndex ? caretNow : replaceEnd;
      const next = value.slice(0, trigger.atIndex) + token + value.slice(end);
      const caret = trigger.atIndex + token.length;
      close();
      setValue(next, caret);
    },
    [textareaRef, value, setValue, close],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!open || results.length === 0) {
        // Escape cierra incluso el estado "armado" sin resultados.
        if (e.key === "Escape" && triggerRef.current) {
          e.preventDefault();
          close();
        }
        return;
      }
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % results.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + results.length) % results.length);
          break;
        case "Enter":
        case "Tab": {
          const user = results[activeIndex];
          if (user) {
            e.preventDefault();
            select(user);
          }
          break;
        }
        case "Escape":
          e.preventDefault();
          close();
          break;
        default:
          break;
      }
    },
    [open, results, activeIndex, select, close],
  );

  const optionId = useCallback(
    (index: number) => `${listboxId}-opt-${index}`,
    [listboxId],
  );

  return {
    open: open && results.length > 0,
    results,
    activeIndex,
    activeOptionId:
      open && results.length > 0 ? optionId(activeIndex) : undefined,
    listboxId,
    optionId,
    onKeyDown,
    onValueChange,
    select,
    close,
    setActiveIndex,
  };
}
