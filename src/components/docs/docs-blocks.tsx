import { Check, Minus } from "lucide-react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

// Bloques presentacionales reutilizables para las páginas de /docs. Server
// Components puros (sin estado): tipografía de lectura, tarjetas de feature y
// listas de ventajas/contras coherentes con el sistema de diseño de la app.

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

/** Encabezado de página: título grande + entradilla. */
export function DocsHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: string;
  lead: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-8">
      {eyebrow ? (
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
        {lead}
      </p>
    </header>
  );
}

/** Sección con título (h2) anclable y cuerpo. */
export function DocsSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <h2
        className="text-2xl font-bold tracking-tight text-foreground"
        id={`${id}-heading`}
      >
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-4 text-pretty leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

/** Tarjeta de funcionalidad: icono + título + descripción. */
export function FeatureCard({
  icon: Icon,
  title,
  children,
}: {
  icon: IconType;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition hover:border-brand/40 hover:shadow-soft">
      <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

/** Tarjeta de decisión técnica: título + tagline + ventajas/contras. */
export function DecisionCard({
  icon: Icon,
  title,
  tagline,
  pros,
  cons,
}: {
  icon: IconType;
  title: string;
  tagline: ReactNode;
  pros: readonly string[];
  cons?: readonly string[];
}) {
  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-6 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {tagline}
          </p>
        </div>
      </div>

      <dl className={cn("grid gap-4", cons?.length && "sm:grid-cols-2")}>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-success">
            Ventajas
          </dt>
          <dd>
            <ul className="mt-2 flex flex-col gap-1.5">
              {pros.map((item) => (
                <li
                  className="flex gap-2 text-sm text-muted-foreground"
                  key={item}
                >
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-success"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>

        {cons?.length ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-official">
              A tener en cuenta
            </dt>
            <dd>
              <ul className="mt-2 flex flex-col gap-1.5">
                {cons.map((item) => (
                  <li
                    className="flex gap-2 text-sm text-muted-foreground"
                    key={item}
                  >
                    <Minus
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-official"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}
