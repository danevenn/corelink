import { cn } from "@/lib/utils";

// Marca de CoreLink: dos nodos enlazados (idea de "core" + "link"/conexión)
// sobre un cuadrado redondeado en color de marca. SVG propio, ligero, nítido a
// cualquier tamaño. Decorativo: el texto adyacente da el nombre accesible.
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground shadow-soft",
        className,
      )}
    >
      <svg
        fill="none"
        height="16"
        viewBox="0 0 24 24"
        width="16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>CoreLink</title>
        <circle cx="8.5" cy="12" fill="currentColor" r="3.2" />
        <circle
          cx="15.5"
          cy="12"
          r="3.2"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M11 12h2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.2"
        />
      </svg>
    </span>
  );
}

/** Marca + wordmark "CoreLink". */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 font-semibold tracking-tight text-foreground",
        className,
      )}
    >
      <BrandMark />
      <span className="text-[1.0625rem]">CoreLink</span>
    </span>
  );
}
