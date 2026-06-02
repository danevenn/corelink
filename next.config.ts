import type { NextConfig } from "next";

// Cabeceras de seguridad aplicadas a TODAS las rutas (Fase 11a).
//
// Conjunto deliberadamente "robusto pero sin CSP estricta": estas cabeceras no
// rompen Next 16 (estilos/scripts inline de next/font y del runtime), Tailwind,
// Better Auth ni el stream SSE de /api/events.
//
// CSP: una política `script-src` estricta requeriría nonces por petición
// (Middleware/runtime), incompatible con el `headers()` estático de aquí. Se
// deja DOCUMENTADA como recomendación en docs/fase11-auditoria.md (Fase 12,
// deploy) en lugar de aplicar una versión que rompa la app o sea cosmética.
const securityHeaders = [
  // Evita el MIME-sniffing del navegador (relevante porque /api/files sirve
  // contenido subido por usuarios).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // App privada: no filtrar la ruta interna al navegar a destinos externos.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Anti-clickjacking. `frame-ancestors 'none'` es el equivalente moderno; se
  // mantiene también X-Frame-Options por compatibilidad con navegadores viejos.
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'",
  },
  // Desactiva APIs potentes que la app no usa.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  images: {
    // Avatares demo servidos por i.pravatar.cc (ver prisma/seed.ts).
    // next/image exige declarar hosts remotos explícitamente.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
    ],
  },
  async headers() {
    return [
      {
        // Todas las rutas, incluidas API. No incluye `Cache-Control`, así que
        // no interfiere con el `no-cache` del stream SSE ni con el cache
        // `immutable` de /api/files.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
