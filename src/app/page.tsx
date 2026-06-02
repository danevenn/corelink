import type { Metadata } from "next";
import Link from "next/link";
import {
  BellIcon,
  BriefcaseIcon,
  HashIcon,
  MessageIcon,
  ReplyIcon,
  SearchIcon,
  ShieldIcon,
} from "@/components/feed/icons";
import { GuestCta } from "@/components/marketing/guest-cta";
import { Reveal, RevealProvider } from "@/components/marketing/reveal";

// Landing pública de CoreLink (A11Y/SEO-01). Server Component: contenido
// estático e indexable a nivel de marcado, con dos islands de cliente (la CTA
// de invitado y los wrappers de animación). Visible sin sesión. La metadata
// Open Graph/título la aporta el root layout (Fase 11a).
export const metadata: Metadata = {
  title: "Conversaciones de equipo, sin ruido",
  description:
    "CoreLink es la red social interna de tu empresa para hablar de procedimientos y gestiones, sin depender de Google Chat, Slack o Teams.",
};

const FEATURES = [
  {
    icon: HashIcon,
    title: "Feed por canales",
    description:
      "Organiza las conversaciones por equipo, proyecto o tema. Publica, comenta y reacciona sin perder el hilo entre mil chats.",
  },
  {
    icon: ShieldIcon,
    title: "Procedimientos oficiales",
    description:
      "Distingue lo aprobado de lo informal: las publicaciones oficiales quedan marcadas y destacadas para que nadie siga un proceso obsoleto.",
  },
  {
    icon: MessageIcon,
    title: "Chat en tiempo real",
    description:
      "Mensajería 1:1 y de grupo en vivo, con confirmaciones de lectura y adjuntos. Para lo que no encaja en un canal público.",
  },
  {
    icon: BellIcon,
    title: "Notificaciones al instante",
    description:
      "Menciones, respuestas y novedades llegan en vivo por streaming. Te enteras de lo importante sin recargar la página.",
  },
  {
    icon: SearchIcon,
    title: "Búsqueda y perfiles",
    description:
      "Encuentra publicaciones, canales y personas. Cada perfil reúne puesto, equipo y actividad reciente del compañero.",
  },
  {
    icon: BriefcaseIcon,
    title: "Todo en casa",
    description:
      "Una herramienta propia de la empresa, sin licencias externas ni datos repartidos entre tres plataformas distintas.",
  },
];

export default function HomePage() {
  return (
    <RevealProvider>
      <div className="flex min-h-dvh flex-col bg-background">
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-foreground"
          href="#contenido"
        >
          Saltar al contenido
        </a>
        <SiteHeader />
        <main id="contenido" className="flex-1">
          <Hero />
          <Features />
          <OfficialBand />
          <FinalCta />
        </main>
        <SiteFooter />
      </div>
    </RevealProvider>
  );
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2 font-semibold text-foreground">
      <span className="grid size-7 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-foreground">
        C
      </span>
      <span>CoreLink</span>
    </span>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          aria-label="CoreLink, inicio"
          className="rounded-lg focus-visible:outline-none"
          href="/"
        >
          <Wordmark />
        </Link>
        <nav aria-label="Acceso" className="flex items-center gap-2">
          <Link
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground sm:inline-flex"
            href="/login"
          >
            Iniciar sesión
          </Link>
          <Link
            className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
            href="/register"
          >
            Crear cuenta
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Resplandor decorativo de marca; no transmite información. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-32 -z-0 mx-auto h-72 max-w-3xl rounded-full bg-brand/15 blur-3xl"
      />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <span
              className="size-1.5 rounded-full bg-brand"
              aria-hidden="true"
            />
            Red social interna de empresa
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Las conversaciones de tu equipo, en un solo lugar
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="max-w-xl text-pretty text-lg text-muted-foreground">
            CoreLink reúne el feed, los procedimientos oficiales y el chat en
            tiempo real de tu empresa. Para hablar de cómo se hacen las cosas
            sin depender de Google Chat, Slack o Teams.
          </p>
        </Reveal>
        <Reveal
          className="flex flex-col items-center gap-3 sm:flex-row"
          delay={0.15}
        >
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
            href="/register"
          >
            Crear cuenta gratis
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-6 text-sm font-medium text-foreground transition hover:bg-surface-muted sm:hidden"
            href="/login"
          >
            Iniciar sesión
          </Link>
          <GuestCta />
        </Reveal>
        <Reveal delay={0.2}>
          <p className="text-xs text-muted-foreground">
            ¿Solo quieres echar un vistazo? Entra como invitado, sin registro.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section
      aria-labelledby="features-heading"
      className="mx-auto w-full max-w-6xl px-4 py-20 sm:py-24"
    >
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2
          className="text-3xl font-bold tracking-tight text-foreground"
          id="features-heading"
        >
          Todo lo que tu equipo necesita para comunicarse
        </h2>
        <p className="mt-4 text-pretty text-muted-foreground">
          Pensado para la comunicación interna del día a día: procesos,
          gestiones y decisiones, con el contexto siempre a mano.
        </p>
      </Reveal>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <li key={feature.title}>
              <Reveal delay={Math.min(index * 0.05, 0.25)}>
                <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-6 transition hover:border-brand/40 hover:shadow-sm">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function OfficialBand() {
  return (
    <section
      aria-labelledby="official-heading"
      className="border-y border-border bg-surface-muted"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-20 sm:py-24 lg:grid-cols-2">
        <Reveal>
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-official-soft px-3 py-1 text-xs font-semibold text-official">
              <ShieldIcon className="size-4" />
              Procedimientos oficiales
            </span>
            <h2
              className="text-3xl font-bold tracking-tight text-foreground"
              id="official-heading"
            >
              Que nadie vuelva a seguir un proceso obsoleto
            </h2>
            <p className="text-pretty text-muted-foreground">
              En el feed conviven ideas, dudas y avisos. CoreLink marca de forma
              destacada las publicaciones oficiales, para que la versión buena
              de cada procedimiento sea inconfundible y fácil de encontrar.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="rounded-2xl border border-official/30 bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-official">
              <ShieldIcon className="size-4" />
              Oficial
            </div>
            <p className="mt-3 font-medium text-foreground">
              Alta de un nuevo proveedor
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Procedimiento actualizado para registrar proveedores en el
              sistema, con los documentos y validaciones requeridos en cada
              paso.
            </p>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <HashIcon className="size-4" />
                operaciones
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ReplyIcon className="size-4" />
                12 respuestas
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:py-28">
      <Reveal>
        <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Empieza a hablar de lo importante
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
          Crea tu cuenta en segundos o entra como invitado para explorar la demo
          con datos de ejemplo.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
            href="/register"
          >
            Crear cuenta
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-6 text-sm font-medium text-foreground transition hover:bg-surface-muted"
            href="/login"
          >
            Iniciar sesión
          </Link>
          <GuestCta />
        </div>
      </Reveal>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
        <Wordmark />
        <p>Red social interna de empresa · Proyecto de portfolio</p>
      </div>
    </footer>
  );
}
