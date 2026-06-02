import { avatarColor, initials } from "@/lib/feed-ui";
import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string;
  src: string | null;
  seed: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-20 text-2xl",
} as const;

/**
 * Avatar estilo Workspace.
 *
 * Por defecto muestra las INICIALES del nombre sobre un círculo de color
 * DERIVADO DETERMINÍSTICAMENTE del seed (estable por usuario). Si hay
 * `avatarUrl` (foto subida, servida same-origin por /api/files), usa la imagen.
 *
 * Server Component presentacional. Para imágenes usamos <img> directo: las
 * fotos van por /api/files auth-gated same-origin, donde next/image no aporta.
 */
export function Avatar({
  name,
  src,
  seed,
  size = "md",
  className,
}: AvatarProps) {
  const box = SIZES[size];

  if (src) {
    return (
      // biome-ignore lint/performance/noImgElement: foto /api/files auth-gated same-origin; next/image no encaja (regla del proyecto).
      <img
        alt={`Avatar de ${name}`}
        className={cn("shrink-0 rounded-full object-cover", box, className)}
        src={src}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-tight text-white",
        avatarColor(seed),
        box,
        className,
      )}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
