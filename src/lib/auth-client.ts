import {
  adminClient,
  anonymousClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Cliente de Better Auth para el navegador.
// Sin baseURL: usa el mismo origen (el handler vive en /api/auth/* de esta app).
// Plugins en paridad con el servidor: organization + anonymous + admin (Fase 6a).
export const authClient = createAuthClient({
  plugins: [organizationClient(), anonymousClient(), adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
