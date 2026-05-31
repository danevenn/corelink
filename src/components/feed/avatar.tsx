import Image from "next/image";
import { avatarColor, initials } from "@/lib/feed-ui";
import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string;
  src: string | null;
  seed: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: { box: "size-8 text-xs", px: 32 },
  md: { box: "size-10 text-sm", px: 40 },
  lg: { box: "size-12 text-base", px: 48 },
} as const;

/** Avatar con imagen (next/image) o fallback de iniciales con color estable. */
export function Avatar({
  name,
  src,
  seed,
  size = "md",
  className,
}: AvatarProps) {
  const { box, px } = SIZES[size];

  if (src) {
    return (
      <Image
        alt={`Avatar de ${name}`}
        className={cn("shrink-0 rounded-full object-cover", box, className)}
        height={px}
        src={src}
        width={px}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white",
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
