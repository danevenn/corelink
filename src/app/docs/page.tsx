import {
  Bell,
  Hash,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  DocsHeader,
  DocsSection,
  FeatureCard,
} from "@/components/docs/docs-blocks";
import { Button } from "@/components/ui/button";

// Índice de /docs — "Sobre CoreLink" (Fase 12). Server Component público:
// contenido estático e indexable a nivel de marcado, sin estado de cliente.

export const metadata: Metadata = {
  title: "Sobre CoreLink",
  description:
    "Qué es CoreLink, a qué problema responde y un resumen de sus funcionalidades: feed por canales, procedimientos oficiales, chat en vivo y más.",
};

const FEATURES = [
  {
    icon: Hash,
    title: "Feed con hilos por canal",
    description:
      "Publicaciones, comentarios anidados y reacciones, organizados en canales por departamento o tema. Cada conversación mantiene su contexto.",
  },
  {
    icon: ShieldCheck,
    title: "Procedimientos oficiales",
    description:
      "Las publicaciones aprobadas se marcan y destacan en ámbar, para distinguir la versión buena de un proceso de lo meramente informal.",
  },
  {
    icon: MessageSquare,
    title: "Chat 1:1 y de grupo en vivo",
    description:
      "Mensajería directa y grupal en tiempo real, con adjuntos y confirmaciones de lectura, para lo que no encaja en un canal público.",
  },
  {
    icon: Bell,
    title: "Notificaciones en tiempo real",
    description:
      "Menciones, respuestas y novedades llegan al instante por streaming, sin recargar la página ni depender de un correo.",
  },
  {
    icon: Search,
    title: "Búsqueda y perfiles",
    description:
      "Encuentra publicaciones, canales y personas. Cada perfil reúne puesto, equipo, actividad reciente y seguidores.",
  },
  {
    icon: Users,
    title: "Follows y perfiles de equipo",
    description:
      "Sigue a compañeros y canales para construir tu propio feed relevante, con multimedia (imágenes y adjuntos) integrada.",
  },
  {
    icon: Sparkles,
    title: "Multimedia integrada",
    description:
      "Imágenes y archivos adjuntos en publicaciones y chats, optimizados automáticamente para cargar rápido en cualquier dispositivo.",
  },
  {
    icon: UserCog,
    title: "Administración y moderación",
    description:
      "Panel para gestionar canales, moderar contenido y dar de alta empleados, con cambio de contraseña forzado en el primer acceso.",
  },
];

export default function DocsIndexPage() {
  return (
    <div className="flex flex-col gap-12">
      <DocsHeader
        eyebrow="Documentación"
        lead="CoreLink es la red social interna de tu empresa: un único espacio para hablar de cómo se hacen las cosas —procedimientos, gestiones y decisiones— sin repartir la conversación entre tres plataformas externas."
        title="Sobre CoreLink"
      />

      <DocsSection id="problema" title="A qué problema responde">
        <p>
          La comunicación interna de muchas empresas vive dispersa entre Google
          Chat, Slack, Teams y el correo. El conocimiento sobre cómo se hace
          cada cosa —el alta de un proveedor, el flujo de aprobación de una
          factura, el procedimiento de onboarding— queda enterrado en hilos
          sueltos, se duplica y envejece sin que nadie lo note.
        </p>
        <p>
          CoreLink reúne ese conocimiento en un solo lugar bajo control de la
          empresa: un feed organizado por canales donde conviven ideas y dudas,
          pero con los <strong>procedimientos oficiales</strong> claramente
          marcados, de modo que la versión vigente de cada proceso sea
          inconfundible. Sin licencias externas y sin datos repartidos entre
          plataformas de terceros.
        </p>
      </DocsSection>

      <DocsSection id="funcionalidades" title="Funcionalidades">
        <p>
          Estas son las piezas principales del producto. Todas funcionan en
          claro y oscuro, son accesibles por teclado y se adaptan al móvil.
        </p>
        <ul className="mt-2 grid list-none gap-4 p-0 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li key={feature.title}>
              <FeatureCard icon={feature.icon} title={feature.title}>
                {feature.description}
              </FeatureCard>
            </li>
          ))}
        </ul>
      </DocsSection>

      <DocsSection id="siguiente" title="Cómo está construido">
        <p>
          CoreLink se ha desarrollado con un stack moderno, autoalojable y de
          coste cero en su demo, priorizando el control sobre los datos y la
          calidad del código. En la siguiente sección se explica cada elección
          técnica y por qué se tomó, con sus ventajas y sus contrapartidas.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/docs/decisiones">Ver las decisiones técnicas</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </DocsSection>
    </div>
  );
}
