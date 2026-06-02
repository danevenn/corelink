import type { Metadata } from "next";
import Link from "next/link";

// 404 global en español. Sustituye al not-found por defecto de Next (en inglés)
// para que el documento cumpla el idioma declarado en <html lang="es">.
export const metadata: Metadata = {
  title: "Página no encontrada",
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-5xl font-bold tracking-tight text-brand">404</p>
      <h1 className="text-xl font-semibold text-foreground">
        Página no encontrada
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        La página que buscas no existe o ya no está disponible.
      </p>
      <Link
        href="/feed"
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:opacity-90"
      >
        Volver al feed
      </Link>
    </main>
  );
}
