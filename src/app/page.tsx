import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
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
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

// Landing pública de CoreLink (A11Y/SEO-01). Server Component: contenido
// estático e indexable a nivel de marcado, con islands de cliente (la CTA de
// invitado, el conmutador de tema y los wrappers de animación). Visible sin
// sesión. La metadata Open Graph/título la aporta el root layout (Fase 11a).
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
          <About />
          <FinalCta />
        </main>
        <SiteFooter />
      </div>
    </RevealProvider>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          aria-label="CoreLink, inicio"
          className="rounded-lg focus-visible:outline-none"
          href="/"
        >
          <Wordmark />
        </Link>
        <nav aria-label="Acceso" className="flex items-center gap-1.5">
          <Button asChild className="hidden sm:inline-flex" variant="ghost">
            <a href="#sobre-nosotros">Sobre nosotros</a>
          </Button>
          <ThemeToggle />
          <Button asChild>
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Resplandores decorativos orgánicos de marca; no informan. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 -z-0 mx-auto h-80 max-w-4xl rounded-[50%] bg-brand/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-40 -z-0 size-72 rounded-full bg-accent2/10 blur-3xl"
      />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-7 px-4 py-24 text-center sm:py-32">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
            <span
              className="size-1.5 rounded-full bg-brand"
              aria-hidden="true"
            />
            Red social interna de empresa
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Las conversaciones de tu equipo,{" "}
            <span className="text-brand">en un solo lugar</span>
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
          <Button asChild size="lg">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <GuestCta />
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
                <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-6 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-soft">
                  <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
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
          <div className="relative overflow-hidden rounded-2xl border border-official/30 bg-surface p-5 shadow-soft">
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-official/70 to-official/20"
            />
            <div className="flex items-center gap-2 text-xs font-semibold text-official">
              <ShieldIcon className="size-4" />
              Oficial
            </div>
            <p className="mt-3 font-medium text-foreground">
              Alta de un nuevo proveedor
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
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

function About() {
  return (
    <section
      aria-labelledby="about-heading"
      className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-20 sm:py-24"
      id="sobre-nosotros"
    >
      <Reveal className="flex flex-col gap-4 text-center">
        <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          Sobre nosotros
        </span>
        <h2
          className="text-3xl font-bold tracking-tight text-foreground"
          id="about-heading"
        >
          Una herramienta propia, hecha en casa
        </h2>
        <p className="text-pretty text-muted-foreground">
          CoreLink nace para que la comunicación interna no dependa de tres
          plataformas externas. Un único espacio, con la información y las
          personas de la empresa, bajo su control. La documentación completa del
          producto llegará pronto.
        </p>
      </Reveal>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-16 text-center shadow-soft sm:px-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-16 mx-auto h-48 max-w-xl rounded-[50%] bg-brand/15 blur-3xl"
          />
          <h2 className="relative text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Empieza a hablar de lo importante
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
            Accede a tu espacio de trabajo. Las cuentas las gestiona tu empresa.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <GuestCta />
          </div>
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
        <p className="text-center sm:text-right">
          Red social interna de empresa · Proyecto de portfolio
          <br className="hidden sm:block" />
          <span className="text-xs">
            Emojis por{" "}
            <a
              className="underline transition hover:text-foreground"
              href="https://github.com/jdecked/twemoji"
              rel="noreferrer"
              target="_blank"
            >
              Twemoji
            </a>{" "}
            (CC-BY 4.0)
          </span>
        </p>
      </div>
    </footer>
  );
}
