import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Cliente de Better Auth para el navegador.
// Sin baseURL: usa el mismo origen (el handler vive en /api/auth/* de esta app).
// Plugins en paridad con el servidor: organization + admin (Fase 6a).
// R1: se quitó `anonymousClient()` — ya no hay acceso de invitado.
export const authClient = createAuthClient({
  plugins: [organizationClient(), adminClient()],
});

// R1: NO exportamos `signUp` — el auto-registro está desactivado en el servidor
// (`emailAndPassword.disableSignUp`). Las altas son server-side (createEmployee).
export const { signIn, signOut, useSession } = authClient;
