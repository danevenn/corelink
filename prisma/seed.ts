// CoreLink — seed de datos demo (Fase 3)
//
// Objetivo: poblar una demo pública "viva" y RESETEABLE.
//   - Usuarios creados vía la API server de Better Auth (`auth.api.signUpEmail`)
//     para que el hash de credenciales en `account` sea 100% compatible con el
//     login real. Después se enriquecen con Profile vía Prisma.
//   - Canales por departamento + temas, posts (con hilos anidados, oficiales),
//     reacciones, follows, menciones y notificaciones.
//
// Reseteable: limpia las tablas de dominio + las de auth de usuarios demo antes
// de sembrar, así `pnpm db:seed` puede correrse N veces sin petar por duplicados.

// El seed corre vía `tsx prisma/seed.ts` (no pasa por prisma.config.ts), así
// que cargamos .env nosotros ANTES de importar db/auth (que leen DATABASE_URL
// en el ámbito de módulo). Como tsx transpila a CJS (sin top-level await),
// hacemos los imports dinámicos dentro de `bootstrap()` tras cargar el entorno.

import type * as PrismaClient from "@/generated/prisma/client";
import type { ChannelType as ChannelTypeT } from "@/generated/prisma/client";
// Tipos (erased en runtime: no ejecutan el código de db/auth).
import type { auth as AuthT } from "@/lib/auth";
import type { prisma as PrismaT } from "@/lib/db";

let auth: typeof AuthT;
let prisma: typeof PrismaT;
let NotificationType: typeof PrismaClient.NotificationType;
let ReactionType: typeof PrismaClient.ReactionType;

const DEMO_PASSWORD = "corelink-demo-2026";

// Roles de plataforma (Fase 6a). Resto de usuarios demo quedan en `user`
// (default). Elegimos a la CTO como admin y al Operations Manager como
// moderator (staff de moderación de procedimientos).
const ADMIN_USER_KEY = "ana"; // Ana Reyes — CTO
const MODERATOR_USER_KEY = "marc"; // Marc Soler — Operations Manager

type DemoUserSpec = {
  key: string;
  name: string;
  email: string;
  displayName: string;
  jobTitle: string;
  bio: string;
  departmentSlug: string;
};

const DEMO_USERS: DemoUserSpec[] = [
  {
    key: "lucia",
    name: "Lucía Martín",
    email: "lucia.martin@corelink.demo",
    displayName: "Lucía Martín",
    jobTitle: "People & Culture Lead",
    bio: "Construyendo equipos felices. Café, podcasts de RRHH y onboarding sin fricción.",
    departmentSlug: "rrhh",
  },
  {
    key: "diego",
    name: "Diego Ferrer",
    email: "diego.ferrer@corelink.demo",
    displayName: "Diego Ferrer",
    jobTitle: "Senior Backend Engineer",
    bio: "Postgres, colas y latencias bajas. Si compila, confío.",
    departmentSlug: "it",
  },
  {
    key: "noa",
    name: "Noa Vidal",
    email: "noa.vidal@corelink.demo",
    displayName: "Noa Vidal",
    jobTitle: "Product Designer",
    bio: "Diseño de producto centrado en personas. Fan de los design tokens.",
    departmentSlug: "it",
  },
  {
    key: "marc",
    name: "Marc Soler",
    email: "marc.soler@corelink.demo",
    displayName: "Marc Soler",
    jobTitle: "Operations Manager",
    bio: "Procesos claros, documentación viva. Menos reuniones, más impacto.",
    departmentSlug: "procedimientos",
  },
  {
    key: "ana",
    name: "Ana Reyes",
    email: "ana.reyes@corelink.demo",
    displayName: "Ana Reyes",
    jobTitle: "CTO",
    bio: "Liderando tecnología en CoreLink. Aprendiendo en público.",
    departmentSlug: "it",
  },
];

type ChannelSpec = {
  slug: string;
  name: string;
  description: string;
  type: ChannelTypeT;
};

// Valores de enum como literales: ChannelType (el const) se importa de forma
// dinámica dentro de `main()`, así que no está disponible en el ámbito de módulo.
const CHANNELS: ChannelSpec[] = [
  {
    slug: "general",
    name: "General",
    description: "Anuncios para toda la compañía y conversación abierta.",
    type: "TOPIC",
  },
  {
    slug: "rrhh",
    name: "RRHH",
    description: "People & Culture: beneficios, onboarding, eventos.",
    type: "DEPARTMENT",
  },
  {
    slug: "it",
    name: "IT",
    description: "Ingeniería, producto y plataforma.",
    type: "DEPARTMENT",
  },
  {
    slug: "procedimientos",
    name: "Procedimientos",
    description: "Procesos oficiales y documentación de la compañía.",
    type: "DEPARTMENT",
  },
  {
    slug: "off-topic",
    name: "Off-topic",
    description: "Memes, recomendaciones y vida fuera del trabajo.",
    type: "TOPIC",
  },
];

/**
 * Limpia el contenido de dominio y los usuarios demo de las tablas de auth.
 * El orden respeta las FKs (los cascades ayudan, pero somos explícitos).
 */
async function reset(): Promise<void> {
  // Dominio
  await prisma.notification.deleteMany();
  await prisma.mention.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.post.deleteMany();
  // Chat (Fase 8a). Cascades arrastrarían members/messages al borrar la
  // conversación, pero somos explícitos y respetamos el orden de FKs.
  await prisma.message.deleteMany();
  await prisma.conversationMember.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.channel.deleteMany();

  // Usuarios: borramos TODOS (account/session caen por cascade). El seed
  // re-crea a continuación SOLO la lista demo, así que un borrado total deja la
  // tabla `user` exactamente con los usuarios demo correctos. Esto, además de
  // permitir re-crear los demo sin chocar por email duplicado, elimina cualquier
  // RESIDUO — p. ej. usuarios `Anonymous` (`temp@…`) que dejó el antiguo acceso
  // invitado (plugin `anonymous`, ya eliminado en R1) — sin dejar huérfanos.
  await prisma.user.deleteMany();
}

/**
 * Crea un usuario vía la API server de Better Auth (hash de credenciales
 * correcto) y devuelve su id. Idempotente: la limpieza previa garantiza que
 * el email no existe todavía.
 *
 * R1: usamos `auth.api.createUser` del plugin admin (NO `signUpEmail`), porque
 * el auto-registro público está desactivado (`disableSignUp`). `createUser` no
 * pasa por el flujo de sign-up, así que no le afecta. Lo llamamos SIN headers:
 * es una llamada de confianza del seed, y sin sesión el plugin no exige permisos.
 * Los usuarios demo quedan con `mustChangePassword=false` (default de columna),
 * para que puedan loguearse directo sin el gate de cambio forzado.
 */
async function createAuthUser(spec: DemoUserSpec): Promise<string> {
  const result = await auth.api.createUser({
    body: {
      name: spec.name,
      email: spec.email,
      password: DEMO_PASSWORD,
    },
  });

  if (!result?.user?.id) {
    throw new Error(`No se pudo crear el usuario demo: ${spec.email}`);
  }

  return result.user.id;
}

async function main(): Promise<void> {
  // Cargar entorno e importar db/auth tras tener DATABASE_URL disponible.
  try {
    process.loadEnvFile();
  } catch {
    // .env ausente: se usan las variables ya presentes en el entorno.
  }
  ({ auth } = await import("@/lib/auth"));
  ({ prisma } = await import("@/lib/db"));
  ({ NotificationType, ReactionType } = await import(
    "@/generated/prisma/client"
  ));

  console.log("🌱 Sembrando CoreLink (demo reseteable)…");
  await reset();

  // 1) Canales ────────────────────────────────────────────────────────────
  const channelBySlug = new Map<string, string>();
  for (const c of CHANNELS) {
    const channel = await prisma.channel.create({
      data: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        type: c.type,
      },
    });
    channelBySlug.set(c.slug, channel.id);
  }
  console.log(`  ✓ ${CHANNELS.length} canales`);

  // 2) Usuarios (Better Auth) + Profiles ────────────────────────────────────
  const userIdByKey = new Map<string, string>();
  for (const spec of DEMO_USERS) {
    const userId = await createAuthUser(spec);
    userIdByKey.set(spec.key, userId);

    await prisma.profile.create({
      data: {
        userId,
        displayName: spec.displayName,
        bio: spec.bio,
        jobTitle: spec.jobTitle,
        departmentId: channelBySlug.get(spec.departmentSlug) ?? null,
        // Sin foto: el Avatar muestra INICIALES sobre un color determinista
        // derivado del usuario (estilo Workspace). Evita el desajuste de los
        // avatares aleatorios de i.pravatar (cara que no cuadra con el nombre).
        avatarUrl: null,
      },
    });
  }
  console.log(`  ✓ ${DEMO_USERS.length} usuarios + perfiles`);

  const uid = (key: string): string => {
    const id = userIdByKey.get(key);
    if (!id) {
      throw new Error(`Usuario demo no encontrado: ${key}`);
    }
    return id;
  };
  const cid = (slug: string): string => {
    const id = channelBySlug.get(slug);
    if (!id) {
      throw new Error(`Canal no encontrado: ${slug}`);
    }
    return id;
  };

  // 2b) Roles de plataforma (Fase 6a) ───────────────────────────────────────
  // El campo `user.role` lo gestiona el plugin admin de Better Auth. Los
  // usuarios nacen como `user` (defaultRole); aquí promovemos a admin/moderator.
  // Idempotente: un `update` directo del campo deja el estado final deseado sin
  // importar cuántas veces se ejecute el seed.
  await prisma.user.update({
    where: { id: uid(ADMIN_USER_KEY) },
    data: { role: "admin" },
  });
  await prisma.user.update({
    where: { id: uid(MODERATOR_USER_KEY) },
    data: { role: "moderator" },
  });
  console.log(
    `  ✓ roles: ${ADMIN_USER_KEY}=admin, ${MODERATOR_USER_KEY}=moderator`,
  );

  // 3) Posts raíz ───────────────────────────────────────────────────────────
  const welcome = await prisma.post.create({
    data: {
      authorId: uid("ana"),
      channelId: cid("general"),
      content:
        "¡Bienvenidos a CoreLink! 🎉 Esta es nuestra nueva red interna. Presentaos por aquí y seguid a vuestros compañeros.",
    },
  });

  const official = await prisma.post.create({
    data: {
      authorId: uid("marc"),
      channelId: cid("procedimientos"),
      isOfficial: true,
      content:
        "📌 PROCEDIMIENTO OFICIAL — Solicitud de vacaciones: pedidlas con 15 días de antelación vía el portal de RRHH. Aprobación por vuestro manager directo.",
    },
  });

  const rrhhPost = await prisma.post.create({
    data: {
      authorId: uid("lucia"),
      channelId: cid("rrhh"),
      content:
        "Recordatorio: el martes tenemos sesión de onboarding para las nuevas incorporaciones. ¡Pasaos a saludar! 👋",
    },
  });

  const itPost = await prisma.post.create({
    data: {
      authorId: uid("diego"),
      channelId: cid("it"),
      content:
        "Hemos migrado el cluster de Postgres a la versión 16. Latencias de lectura un 30% mejores. 🚀",
    },
  });

  await prisma.post.create({
    data: {
      authorId: uid("noa"),
      channelId: cid("off-topic"),
      content:
        "Recomendación de la semana: el nuevo set de iconos open-source que estamos probando para el design system.",
    },
  });

  // 4) Hilo anidado (respuestas a `itPost`) ─────────────────────────────────
  const reply1 = await prisma.post.create({
    data: {
      authorId: uid("ana"),
      channelId: cid("it"),
      parentId: itPost.id,
      content: "Gran trabajo equipo. ¿Tenemos métricas del impacto en el p99?",
    },
  });

  await prisma.post.create({
    data: {
      authorId: uid("diego"),
      channelId: cid("it"),
      parentId: reply1.id,
      content: "Sí, p99 bajó de 180ms a 120ms. Lo comparto en el dashboard.",
    },
  });

  await prisma.post.create({
    data: {
      authorId: uid("noa"),
      channelId: cid("it"),
      parentId: itPost.id,
      content: "¡Se nota en la carga del feed! Mucho más fluido. 👏",
    },
  });

  // Respuesta al post de bienvenida
  await prisma.post.create({
    data: {
      authorId: uid("lucia"),
      channelId: cid("general"),
      parentId: welcome.id,
      content: "¡Qué ilusión! Encantada de teneros a todos por aquí. 💜",
    },
  });

  console.log("  ✓ posts + hilos anidados");

  // 5) Reacciones (varios tipos, sin duplicar) ──────────────────────────────
  await prisma.reaction.createMany({
    data: [
      {
        userId: uid("lucia"),
        postId: welcome.id,
        type: ReactionType.CELEBRATE,
      },
      { userId: uid("diego"), postId: welcome.id, type: ReactionType.LIKE },
      { userId: uid("noa"), postId: welcome.id, type: ReactionType.SUPPORT },
      {
        userId: uid("ana"),
        postId: official.id,
        type: ReactionType.INSIGHTFUL,
      },
      { userId: uid("diego"), postId: official.id, type: ReactionType.LIKE },
      { userId: uid("ana"), postId: itPost.id, type: ReactionType.CELEBRATE },
      { userId: uid("noa"), postId: itPost.id, type: ReactionType.INSIGHTFUL },
      { userId: uid("marc"), postId: itPost.id, type: ReactionType.LIKE },
      { userId: uid("diego"), postId: rrhhPost.id, type: ReactionType.SUPPORT },
    ],
  });
  console.log("  ✓ reacciones");

  // 6) Follows ──────────────────────────────────────────────────────────────
  await prisma.follow.createMany({
    data: [
      { followerId: uid("lucia"), followingId: uid("ana") },
      { followerId: uid("diego"), followingId: uid("ana") },
      { followerId: uid("noa"), followingId: uid("ana") },
      { followerId: uid("noa"), followingId: uid("diego") },
      { followerId: uid("marc"), followingId: uid("lucia") },
      { followerId: uid("ana"), followingId: uid("diego") },
    ],
  });
  console.log("  ✓ follows");

  // 7) Menciones + notificaciones coherentes ────────────────────────────────
  await prisma.mention.create({
    data: { postId: reply1.id, mentionedUserId: uid("diego") },
  });

  await prisma.notification.createMany({
    data: [
      // Ana responde al post de Diego
      {
        userId: uid("diego"),
        actorId: uid("ana"),
        type: NotificationType.REPLY,
        postId: reply1.id,
      },
      // Mención a Diego
      {
        userId: uid("diego"),
        actorId: uid("ana"),
        type: NotificationType.MENTION,
        postId: reply1.id,
      },
      // Reacción de Ana al post oficial de Marc
      {
        userId: uid("marc"),
        actorId: uid("ana"),
        type: NotificationType.REACTION,
        postId: official.id,
      },
      // Lucía sigue a Ana
      {
        userId: uid("ana"),
        actorId: uid("lucia"),
        type: NotificationType.FOLLOW,
      },
      // Post oficial publicado por Marc → aviso a la compañía (ej. Diego)
      {
        userId: uid("diego"),
        actorId: uid("marc"),
        type: NotificationType.OFFICIAL_POST,
        postId: official.id,
      },
    ],
  });
  console.log("  ✓ menciones + notificaciones");

  // 8) Chat demo (Fase 8a) ──────────────────────────────────────────────────
  // Un DM 1:1 (Lucía ↔ Diego) y un grupo (Ana ADMIN + Diego + Noa) con algunos
  // mensajes, para que la UI de 8b tenga conversaciones que mostrar. Idempotente
  // por el reset previo. `directKey` se construye igual que en la action
  // (ids del par ordenados).
  const directKey = (a: string, b: string): string =>
    a < b ? `${a}:${b}` : `${b}:${a}`;

  const dm = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      directKey: directKey(uid("lucia"), uid("diego")),
      createdById: uid("lucia"),
      members: {
        create: [
          { userId: uid("lucia"), role: "MEMBER" },
          { userId: uid("diego"), role: "MEMBER" },
        ],
      },
    },
  });
  await prisma.message.createMany({
    data: [
      {
        conversationId: dm.id,
        senderId: uid("lucia"),
        content: "Hola Diego, ¿tienes un momento para revisar el onboarding?",
      },
      {
        conversationId: dm.id,
        senderId: uid("diego"),
        content: "¡Claro! Dame 10 min y lo vemos. 👍",
      },
      {
        conversationId: dm.id,
        senderId: uid("lucia"),
        content: "Perfecto, te paso el enlace al doc.",
      },
    ],
  });
  // Lucía ya leyó hasta el final; Diego deja el último mensaje sin leer.
  await prisma.conversationMember.update({
    where: {
      conversationId_userId: { conversationId: dm.id, userId: uid("lucia") },
    },
    data: { lastReadAt: new Date() },
  });

  const group = await prisma.conversation.create({
    data: {
      type: "GROUP",
      name: "Plataforma CoreLink",
      createdById: uid("ana"),
      members: {
        create: [
          { userId: uid("ana"), role: "ADMIN" },
          { userId: uid("diego"), role: "MEMBER" },
          { userId: uid("noa"), role: "MEMBER" },
        ],
      },
    },
  });
  await prisma.message.createMany({
    data: [
      {
        conversationId: group.id,
        senderId: uid("ana"),
        content: "Equipo, abro este grupo para coordinar la nueva plataforma.",
      },
      {
        conversationId: group.id,
        senderId: uid("noa"),
        content: "¡Genial! Subo los mockups esta tarde.",
      },
      {
        conversationId: group.id,
        senderId: uid("diego"),
        content: "Yo preparo el esquema de la API. ¿Lo vemos mañana?",
      },
    ],
  });
  console.log("  ✓ chat demo (1 DM + 1 grupo con mensajes)");

  console.log("✅ Seed completado.");
}

main()
  .catch((err) => {
    console.error("❌ Error en el seed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // `prisma` solo está asignado si `main()` llegó a importarlo.
    await prisma?.$disconnect();
  });
