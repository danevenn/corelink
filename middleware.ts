import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Middleware (runtime Node, Next 16): comprobación optimista de la cookie de
// sesión de Better Auth para proteger el grupo de rutas autenticadas (p. ej.
// /feed). NO valida la sesión contra la BD aquí (eso sería pesado en el borde y
// arrastraría el adaptador de Prisma al bundle del middleware); la validación
// REAL la hace el layout del grupo (app) en el servidor — defensa en profundidad.
// Las rutas (marketing), (auth) y /docs quedan públicas por no entrar en el matcher.
export const config = {
  runtime: "nodejs",
  matcher: ["/feed/:path*"],
};

export default function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
