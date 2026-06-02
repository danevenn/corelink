"use client";

// Conmutador claro/oscuro accesible (next-themes). Cliente por necesidad.
// Evita el desajuste de hidratación renderizando un placeholder hasta montar.

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const ORDER = ["light", "dark", "system"] as const;
const LABEL: Record<(typeof ORDER)[number], string> = {
  light: "Tema claro",
  dark: "Tema oscuro",
  system: "Tema del sistema",
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = (theme ?? "system") as (typeof ORDER)[number];

  function cycle() {
    const idx = ORDER.indexOf(current);
    const next = ORDER[(idx + 1) % ORDER.length] ?? "system";
    setTheme(next);
  }

  return (
    <Button
      aria-label={
        mounted ? `${LABEL[current]} (cambiar)` : "Cambiar tema de color"
      }
      className={className}
      onClick={cycle}
      size="icon"
      type="button"
      variant="ghost"
    >
      {!mounted ? (
        <Monitor className="size-5" />
      ) : current === "light" ? (
        <Sun className="size-5" />
      ) : current === "dark" ? (
        <Moon className="size-5" />
      ) : (
        <Monitor className="size-5" />
      )}
    </Button>
  );
}
