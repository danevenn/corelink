// Implementación del bus de eventos sobre Postgres LISTEN/NOTIFY (Fase 7a).
// server-only: abre un pg.Client de larga vida; jamás debe ir al bundle cliente.
//
// ── Por qué un `pg.Client` DEDICADO y de larga vida ─────────────────────────
// El singleton de Prisma (`src/lib/db.ts`) usa un POOL de conexiones: cada
// query toma una conexión del pool y la devuelve al terminar. `LISTEN` no
// funciona así: la suscripción vive en UNA conexión TCP concreta y debe
// permanecer abierta indefinidamente para recibir los `NOTIFY`. Si usáramos el
// pool, el `LISTEN` quedaría atado a una conexión que el pool podría reciclar o
// cerrar, perdiendo eventos silenciosamente. Por eso abrimos UN `pg.Client`
// propio (misma DATABASE_URL que el pool de Prisma), hacemos `LISTEN` una sola
// vez y lo mantenemos vivo, con reconexión automática si la conexión se cae.
//
// El `publish`, en cambio, es una operación efímera (un `SELECT pg_notify(...)`)
// y la hacemos por el pool de Prisma (`$executeRaw`), que es lo que ya está
// caliente y gestionado. No necesita la conexión de larga vida.
//
// ── Singleton ───────────────────────────────────────────────────────────────
// Guardamos la instancia en `globalThis` para que el hot-reload de desarrollo
// no abra N clientes (un LISTEN por recompilación agotaría conexiones). En
// producción serverless cada instancia tiene la suya.
//
// ── CAVEAT Neon en producción (NO resolver ahora; es para la fase de deploy) ─
// LISTEN/NOTIFY requiere una conexión TCP DIRECTA y persistente a Postgres. El
// driver serverless HTTP/WebSocket de Neon (el que se usa en funciones Edge) NO
// soporta LISTEN/NOTIFY. En local (Docker Postgres) funciona nativo. Para la
// demo en Neon habrá que: (a) usar la connection string DIRECTA (no la pooled
// de PgBouncer, que tampoco soporta LISTEN en modo transaction) en un runtime
// Node de larga vida, o (b) sustituir esta implementación por un bus Redis
// pub/sub (Upstash) — gracias a la interfaz `EventBus`, cambiar el transporte
// no toca a los consumidores. Documentado para Fase 12 (deploy).

import { Client } from "pg";
import { prisma } from "@/lib/db";
import type {
  AppEvent,
  EventBus,
  EventEnvelope,
  EventHandler,
  Unsubscribe,
} from "./types";

/** Canal único de Postgres por el que viajan TODOS los eventos de CoreLink. */
const CHANNEL = "corelink_events";

/** Backoff (ms) para reintentar la conexión del Client de LISTEN si se cae. */
const RECONNECT_DELAY_MS = 1000;

type Subscribers = Map<string, Set<EventHandler>>;

/**
 * Bus de larga vida. Mantiene:
 *   - `subscribers`: handlers locales agrupados por userId.
 *   - `client`: el `pg.Client` dedicado con el LISTEN activo.
 * El estado vive en el objeto, una sola instancia por proceso (ver singleton).
 */
class PgEventBus implements EventBus {
  private readonly subscribers: Subscribers = new Map();
  private client: Client | null = null;
  private connecting: Promise<void> | null = null;
  private closed = false;

  /**
   * Asegura que el Client dedicado está conectado y escuchando el canal.
   * Idempotente y a prueba de carreras: si ya hay una conexión en curso,
   * espera a la misma promesa en vez de abrir otra.
   */
  private async ensureListening(): Promise<void> {
    if (this.client) return;
    if (this.connecting) return this.connecting;

    this.connecting = this.connect();
    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  private async connect(): Promise<void> {
    const client = new Client({ connectionString: process.env.DATABASE_URL });

    // Si la conexión muere (red, reinicio de Postgres), reconectamos y re-LISTEN.
    client.on("error", () => {
      this.handleDisconnect(client);
    });
    client.on("end", () => {
      this.handleDisconnect(client);
    });

    // Cada NOTIFY recibido llega aquí: parseamos y despachamos localmente.
    client.on("notification", (msg) => {
      if (msg.channel !== CHANNEL || !msg.payload) return;
      this.dispatch(msg.payload);
    });

    await client.connect();
    await client.query(`LISTEN ${CHANNEL}`);
    this.client = client;
  }

  /** Reacciona a una caída del Client: limpia y reprograma reconexión. */
  private handleDisconnect(broken: Client): void {
    // Ignora eventos de un client viejo ya reemplazado.
    if (this.client !== broken && this.client !== null) return;
    this.client = null;
    if (this.closed) return;

    // Solo reintentamos si aún hay alguien suscrito; si no, nos reconectamos de
    // forma perezosa en el próximo subscribe/publish.
    if (this.totalHandlers() === 0) return;

    setTimeout(() => {
      if (this.closed || this.totalHandlers() === 0) return;
      void this.ensureListening().catch(() => {
        // Si vuelve a fallar, el propio `error`/`end` reprograma otro intento.
      });
    }, RECONNECT_DELAY_MS);
  }

  private totalHandlers(): number {
    let n = 0;
    for (const set of this.subscribers.values()) n += set.size;
    return n;
  }

  /** Parsea el sobre JSON recibido y entrega a los handlers del userId. */
  private dispatch(payload: string): void {
    let envelope: EventEnvelope;
    try {
      envelope = JSON.parse(payload) as EventEnvelope;
    } catch {
      return; // Payload corrupto: lo ignoramos en lugar de tumbar el listener.
    }
    const handlers = this.subscribers.get(envelope.userId);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(envelope.event);
      } catch {
        // Un handler defectuoso no debe afectar a los demás suscriptores.
      }
    }
  }

  /**
   * Publica un evento para `userId`. Emite un `pg_notify` con el sobre JSON.
   * Lo hacemos por el pool de Prisma (no por el Client de LISTEN): es una
   * operación efímera y aprovecha la conexión ya gestionada.
   */
  async publish(userId: string, event: AppEvent): Promise<void> {
    const envelope: EventEnvelope = { userId, event };
    const payload = JSON.stringify(envelope);

    // Guardarraíl: NOTIFY tiene un límite de ~8000 bytes. Si el payload se
    // pasa, es un bug de diseño (evento demasiado gordo) — fallar ruidoso.
    if (Buffer.byteLength(payload, "utf8") > 7900) {
      throw new Error(
        "AppEvent demasiado grande para pg_notify (>7900 bytes). " +
          "Reduce el payload a IDs y refetchea los detalles en cliente.",
      );
    }

    // Parametrizado: el payload va como bind ($1), nunca interpolado en el SQL.
    await prisma.$executeRaw`SELECT pg_notify(${CHANNEL}, ${payload})`;
  }

  /**
   * Suscribe un handler local a los eventos de `userId`. Devuelve la función de
   * unsubscribe. Arranca el LISTEN perezosamente en la primera suscripción.
   */
  subscribe(userId: string, handler: EventHandler): Unsubscribe {
    let handlers = this.subscribers.get(userId);
    if (!handlers) {
      handlers = new Set();
      this.subscribers.set(userId, handlers);
    }
    handlers.add(handler);

    // Arranca/garantiza el Client de LISTEN (no bloqueamos al suscriptor).
    void this.ensureListening().catch(() => {
      // Si falla la conexión inicial, la reconexión perezosa lo reintentará.
    });

    return () => {
      const set = this.subscribers.get(userId);
      if (!set) return;
      set.delete(handler);
      if (set.size === 0) this.subscribers.delete(userId);
    };
  }
}

// ── Singleton (evita N clients en hot-reload de desarrollo) ─────────────────

const globalForBus = globalThis as unknown as {
  corelinkEventBus: PgEventBus | undefined;
};

export const eventBus: EventBus =
  globalForBus.corelinkEventBus ?? new PgEventBus();

if (process.env.NODE_ENV !== "production") {
  globalForBus.corelinkEventBus = eventBus as PgEventBus;
}
