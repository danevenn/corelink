import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

// Layout público de /docs (Fase 12). Server Component: la documentación es
// contenido estático, con la marca y la navegación coherentes con la landing.
// Cabecera fija, sidebar de secciones y contenedor de lectura centrado. Visible
// sin sesión: /docs queda fuera del matcher del middleware (rutas públicas).

export default function DocsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-foreground"
        href="#doc-contenido"
      >
        Saltar al contenido
      </a>

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
              <Link href="/">
                <ArrowLeft aria-hidden="true" className="size-4" />
                Volver al inicio
              </Link>
            </Button>
            <ThemeToggle />
            <Button asChild>
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-10 lg:flex-row lg:gap-12 lg:py-14">
        <aside className="lg:w-64 lg:shrink-0">
          <div className="lg:sticky lg:top-24">
            <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Documentación
            </p>
            <DocsSidebar />
          </div>
        </aside>

        <main className="min-w-0 flex-1" id="doc-contenido">
          {children}
        </main>
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <Wordmark />
          <p className="text-center sm:text-right">
            Red social interna de empresa · Proyecto de portfolio
          </p>
        </div>
      </footer>
    </div>
  );
}
