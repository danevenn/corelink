import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-background p-6">
      {/* Resplandor orgánico de marca, decorativo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-72 max-w-md rounded-[50%] bg-brand/15 blur-3xl"
      />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4">
        <Link
          aria-label="CoreLink, inicio"
          className="rounded-lg focus-visible:outline-none"
          href="/"
        >
          <Wordmark />
        </Link>
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm rounded-3xl border border-border bg-surface p-8 shadow-soft">
        {children}
      </div>
    </main>
  );
}
