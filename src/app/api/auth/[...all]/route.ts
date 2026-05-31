import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Route handler que expone todos los endpoints de Better Auth
// bajo /api/auth/* (sign-in, sign-up, sign-out, session, organization, anonymous...).
export const { GET, POST } = toNextJsHandler(auth);
