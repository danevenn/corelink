import {
  CheckCircle2,
  Database,
  Image as ImageIcon,
  Layers,
  Palette,
  Radio,
  Rocket,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  DecisionCard,
  DocsHeader,
  DocsSection,
} from "@/components/docs/docs-blocks";
import { Button } from "@/components/ui/button";

// /docs/decisiones — "Decisiones técnicas" (Fase 12). Server Component público:
// explica el stack y el porqué de cada elección, con ventajas/contras, en un
// lenguaje accesible para un cliente con algo de base técnica.

export const metadata: Metadata = {
  title: "Decisiones técnicas",
  description:
    "El stack de CoreLink y el porqué de cada elección, con ventajas y contrapartidas: Next.js 16, Better Auth, Prisma + PostgreSQL, tiempo real con SSE y más.",
};

const STACK = [
  { area: "Framework", tech: "Next.js 16 · React 19 · TypeScript estricto" },
  { area: "Autenticación", tech: "Better Auth (self-host, roles)" },
  { area: "Base de datos", tech: "PostgreSQL 16 · Prisma ORM" },
  { area: "Tiempo real", tech: "SSE sobre Postgres LISTEN/NOTIFY" },
  { area: "Búsqueda", tech: "Full-text nativo de PostgreSQL" },
  { area: "Interfaz", tech: "Tailwind CSS v4 · shadcn/ui · diseño propio" },
  {
    area: "Multimedia",
    tech: "Storage abstracto (local / Vercel Blob) · sharp",
  },
  {
    area: "Calidad",
    tech: "Biome · Vitest · Playwright · axe · CI en GitHub Actions",
  },
  { area: "Despliegue", tech: "Vercel · Neon (planes gratuitos)" },
] as const;

export default function DocsDecisionsPage() {
  return (
    <div className="flex flex-col gap-12">
      <DocsHeader
        eyebrow="Documentación"
        lead="Cada pieza del stack se eligió con un criterio: control sobre los datos, coste cero en la demo y una experiencia de desarrollo que mantenga la calidad alta. Aquí está el porqué de cada decisión, con sus contrapartidas."
        title="Decisiones técnicas"
      />

      <DocsSection id="resumen" title="El stack de un vistazo">
        <p>
          CoreLink es una aplicación full-stack autoalojable. Esta tabla resume
          las tecnologías; debajo se desarrolla el razonamiento de cada una.
        </p>
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">
              Resumen del stack técnico de CoreLink por área
            </caption>
            <thead>
              <tr className="bg-surface-muted">
                <th
                  className="px-4 py-3 font-semibold text-foreground"
                  scope="col"
                >
                  Área
                </th>
                <th
                  className="px-4 py-3 font-semibold text-foreground"
                  scope="col"
                >
                  Tecnología
                </th>
              </tr>
            </thead>
            <tbody>
              {STACK.map((row) => (
                <tr
                  className="border-t border-border bg-surface"
                  key={row.area}
                >
                  <th
                    className="px-4 py-3 font-medium text-foreground"
                    scope="row"
                  >
                    {row.area}
                  </th>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.tech}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocsSection>

      <DocsSection id="decisiones" title="Por qué cada elección">
        <p>
          Ninguna decisión es absoluta: casi todas tienen alternativas válidas.
          Lo importante es que cada una responda a una necesidad concreta del
          proyecto y que sus contrapartidas estén asumidas conscientemente.
        </p>

        <div className="mt-2 flex flex-col gap-5">
          <DecisionCard
            cons={[
              "El modelo de Server Components y Server Actions tiene curva de aprendizaje.",
              "Es un framework que evoluciona rápido; conviene seguir sus versiones.",
            ]}
            icon={Layers}
            pros={[
              "Renderizado en servidor por defecto: páginas rápidas y menos JavaScript en el cliente.",
              "Server Actions evitan tener que construir y mantener una API REST aparte.",
              "TypeScript estricto detecta errores antes de llegar a producción.",
            ]}
            tagline="Next.js 16 (App Router) con React 19 y TypeScript estricto como base de toda la aplicación."
            title="Next.js 16 + React 19 + TypeScript"
          />

          <DecisionCard
            cons={[
              "Al autoalojar la autenticación, la seguridad de la sesión es responsabilidad nuestra.",
              "Ecosistema más joven que el de alternativas consolidadas.",
            ]}
            icon={ShieldCheck}
            pros={[
              "Self-host total: los usuarios y las sesiones viven en nuestra propia base de datos.",
              "Control completo sobre roles y permisos (empleado, administrador) sin un proveedor externo.",
              "Sin coste por usuario ni dependencia de un servicio de pago, a diferencia de Clerk.",
            ]}
            tagline="Better Auth en lugar de Auth.js o Clerk: queríamos la sesión y los roles bajo nuestro control, sin servicios de terceros."
            title="Autenticación con Better Auth"
          />

          <DecisionCard
            cons={[
              "Frente a Drizzle, Prisma añade una capa de generación de cliente y algo de peso.",
              "Es una elección debatible: Drizzle ofrece SQL más cercano; aquí pesó más la DX.",
            ]}
            icon={Database}
            pros={[
              "PostgreSQL es una base de datos relacional robusta, estándar y sin sorpresas.",
              "Prisma da un modelo de datos tipado y migraciones reproducibles con buena experiencia de desarrollo.",
              "El esquema es la fuente de verdad: cambios de datos versionados y revisables.",
            ]}
            tagline="Prisma sobre PostgreSQL. La elección de Prisma frente a Drizzle es debatible; primamos la experiencia de desarrollo y las migraciones."
            title="PostgreSQL + Prisma"
          />

          <DecisionCard
            cons={[
              "SSE es unidireccional (servidor → cliente); para enviar se usan acciones normales.",
              "Requiere gestionar las conexiones abiertas con cuidado para no agotar recursos.",
            ]}
            icon={Radio}
            pros={[
              "Tiempo real sin servicios de pago como Pusher o Ably: todo se queda en casa.",
              "Reutiliza la propia base de datos (LISTEN/NOTIFY de Postgres) como bus de eventos.",
              "Server-Sent Events es un estándar simple del navegador, sin librerías pesadas en el cliente.",
            ]}
            tagline="Notificaciones y chat en vivo con SSE sobre el LISTEN/NOTIFY de Postgres, en vez de un servicio externo de tiempo real."
            title="Tiempo real con SSE sobre Postgres"
          />

          <DecisionCard
            cons={[
              "Menos potente que un motor dedicado en relevancia avanzada o idiomas múltiples.",
              "Para volúmenes muy grandes, un buscador especializado escalaría mejor.",
            ]}
            icon={Search}
            pros={[
              "La búsqueda full-text nativa de Postgres cubre el caso sin Elasticsearch ni Algolia.",
              "Una infraestructura menos que desplegar, mantener y pagar.",
              "Los datos no salen de la base de datos: menos superficie y mayor privacidad.",
            ]}
            tagline="Búsqueda con el full-text nativo de PostgreSQL en lugar de Elastic o Algolia: suficiente para el volumen interno de una empresa."
            title="Búsqueda full-text de PostgreSQL"
          />

          <DecisionCard
            icon={Palette}
            pros={[
              "Tailwind v4 (CSS-first) y shadcn/ui dan una base accesible y rápida de iterar.",
              "Sistema de diseño propio con marca teal: identidad distintiva, no una plantilla genérica.",
              "Iconos vectoriales y emojis Twemoji: aspecto consistente en cualquier sistema operativo.",
            ]}
            tagline="Tailwind CSS v4 con shadcn/ui como cimiento, sobre el que se construye un sistema de diseño propio (tokens, marca, dark mode)."
            title="Interfaz: Tailwind v4 + shadcn/ui + diseño propio"
          />

          <DecisionCard
            icon={ImageIcon}
            pros={[
              "Almacenamiento abstracto: el mismo código usa disco local en desarrollo o Vercel Blob en producción.",
              "Cambiar de proveedor de archivos no obliga a tocar la lógica de la aplicación.",
              "Las imágenes se optimizan con sharp, así cargan rápido en cualquier dispositivo.",
            ]}
            tagline="Multimedia con una capa de almacenamiento abstracta (driver local o Vercel Blob) y optimización de imágenes con sharp."
            title="Multimedia con storage abstracto"
          />

          <DecisionCard
            icon={CheckCircle2}
            pros={[
              "TypeScript estricto y Biome (lint + formato) mantienen el código consistente y sin errores triviales.",
              "Tests unitarios e integración con Vitest y end-to-end con Playwright.",
              "Accesibilidad verificada con axe (0 violaciones) e integración continua en GitHub Actions.",
            ]}
            tagline="La calidad es parte del producto: tipado estricto, análisis estático, pruebas automáticas y accesibilidad verificada en cada cambio."
            title="Calidad: tipos, tests, a11y y CI"
          />

          <DecisionCard
            icon={Rocket}
            pros={[
              "Despliegue en Vercel y base de datos en Neon, ambos en sus planes gratuitos.",
              "La demo de portfolio no tiene coste de infraestructura recurrente.",
              "Integración natural con Next.js: previsualizaciones por cada cambio y métricas reales de rendimiento.",
            ]}
            tagline="Despliegue en Vercel con base de datos PostgreSQL gestionada en Neon, todo dentro de planes gratuitos."
            title="Despliegue en Vercel + Neon"
          />
        </div>
      </DocsSection>

      <DocsSection id="cierre" title="En resumen">
        <p>
          CoreLink demuestra que se puede construir una herramienta interna
          completa —feed, procedimientos oficiales, chat en vivo, búsqueda,
          administración— de forma autoalojable, con control total sobre los
          datos y sin coste de licencias, sin renunciar a la calidad ni a la
          accesibilidad.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="outline">
            <Link href="/docs">Volver a «Sobre CoreLink»</Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </DocsSection>
    </div>
  );
}
