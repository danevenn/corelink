import Link from "next/link";
import { cn } from "@/lib/utils";

// Render de UNA mención `@displayName` como enlace al perfil del usuario.
//
// Server Component presentacional. El texto visible es el `displayName` del
// token (el backend valida el userId contra BD; aquí solo pintamos). Estilo de
// marca (teal, font-medium, hover sutil) y accesible (`aria-label` explícito).
//
// Seguridad: `displayName`/`userId` llegan como TEXTO (nodos React), nunca como
// HTML → sin vector XSS. El href se compone con el userId ya capturado por la
// regex del token (sin ')' ni espacios por definición).

type Props = {
  userId: string;
  displayName: string;
  /** Sube el z-index sobre un overlay-link de la card (evita anidar <a>). */
  raised?: boolean;
  /**
   * Clases de color para superficies donde el teal no contrasta (p.ej. la
   * burbuja propia con fondo de marca). Reemplaza el color por defecto.
   */
  className?: string;
};

export function MentionLink({ userId, displayName, raised, className }: Props) {
  return (
    <Link
      aria-label={`Ver perfil de ${displayName}`}
      className={cn(
        "rounded font-medium underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
        className ?? "text-brand",
        raised && "relative z-10",
      )}
      href={`/users/${userId}`}
    >
      @{displayName}
    </Link>
  );
}
