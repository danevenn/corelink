import type { SVGProps } from "react";
import type { ReactionType } from "@/generated/prisma/enums";

// Iconos de reacción VECTORIALES propios de CoreLink (NO emojis del sistema).
// Diseñados coherentes entre sí: trazo redondeado de 1.6, viewBox 24, con un
// relleno suave (fill-current opacity baja) que se enciende cuando la reacción
// está activa. `currentColor` permite que hereden el color de marca/estado.
//
// - LIKE       → pulgar arriba ("me gusta")
// - CELEBRATE  → destello/chispa ("celebrar")
// - INSIGHTFUL → bombilla ("interesante")
// - SUPPORT    → manos/corazón de apoyo ("apoyo")

type IconProps = SVGProps<SVGSVGElement> & { active?: boolean };

function svgBase({ active, ...props }: IconProps) {
  return {
    "aria-hidden": true as const,
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

/** Relleno suave que se enciende con la reacción activa. */
function fillProps(active: boolean | undefined) {
  return {
    fill: "currentColor",
    className: active ? "opacity-100" : "opacity-0",
    stroke: "none",
  } as const;
}

export function LikeIcon({ active, ...props }: IconProps) {
  return (
    <svg {...svgBase({ active, ...props })}>
      <title>Me gusta</title>
      <path
        {...fillProps(active)}
        d="M7 10.5h2.2l1.7-4.1a2 2 0 0 1 3.8 1.1l-.5 2.4H18a1.8 1.8 0 0 1 1.8 2.2l-1.1 5a2 2 0 0 1-2 1.6H9.2A2.2 2.2 0 0 1 7 16.5z"
      />
      <path d="M7 10.5h2.2l1.7-4.1a2 2 0 0 1 3.8 1.1l-.5 2.4H18a1.8 1.8 0 0 1 1.8 2.2l-1.1 5a2 2 0 0 1-2 1.6H9.2A2.2 2.2 0 0 1 7 16.5z" />
      <path d="M7 10.5v8.5H5a1 1 0 0 1-1-1v-6.5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

export function CelebrateIcon({ active, ...props }: IconProps) {
  return (
    <svg {...svgBase({ active, ...props })}>
      <title>Celebrar</title>
      <path
        {...fillProps(active)}
        d="M12 3.5l1.7 4.1L18 9l-3.6 2.7.9 4.4L12 14l-3.3 2.1.9-4.4L6 9l4.3-1.4z"
      />
      <path d="M12 3.5l1.7 4.1L18 9l-3.6 2.7.9 4.4L12 14l-3.3 2.1.9-4.4L6 9l4.3-1.4z" />
      <path d="M5 17.5l-.8 1.8M19 17.5l.8 1.8M5 6l-1.5-.6M19 6l1.5-.6" />
    </svg>
  );
}

export function InsightfulIcon({ active, ...props }: IconProps) {
  return (
    <svg {...svgBase({ active, ...props })}>
      <title>Interesante</title>
      <path
        {...fillProps(active)}
        d="M12 3.5a6 6 0 0 1 3.6 10.8c-.6.5-.9 1-1 1.7H9.4c-.1-.7-.4-1.2-1-1.7A6 6 0 0 1 12 3.5z"
      />
      <path d="M12 3.5a6 6 0 0 1 3.6 10.8c-.6.5-.9 1-1 1.7H9.4c-.1-.7-.4-1.2-1-1.7A6 6 0 0 1 12 3.5z" />
      <path d="M9.5 18.5h5M10.5 20.5h3" />
    </svg>
  );
}

export function SupportIcon({ active, ...props }: IconProps) {
  return (
    <svg {...svgBase({ active, ...props })}>
      <title>Apoyo</title>
      <path
        {...fillProps(active)}
        d="M12 20.5l-6.4-6a4 4 0 0 1 5.7-5.6l.7.7.7-.7a4 4 0 0 1 5.7 5.6z"
      />
      <path d="M12 20.5l-6.4-6a4 4 0 0 1 5.7-5.6l.7.7.7-.7a4 4 0 0 1 5.7 5.6z" />
    </svg>
  );
}

export const REACTION_ICON: Record<
  ReactionType,
  (props: IconProps) => React.JSX.Element
> = {
  LIKE: LikeIcon,
  CELEBRATE: CelebrateIcon,
  INSIGHTFUL: InsightfulIcon,
  SUPPORT: SupportIcon,
};
