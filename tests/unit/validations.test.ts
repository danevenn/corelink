import { describe, expect, it } from "vitest";
import {
  appRoleSchema,
  createEmployeeSchema,
  employeeRoleSchema,
} from "@/lib/validations/admin";
import { changePasswordSchema, loginSchema } from "@/lib/validations/auth";
import {
  createGroupSchema,
  getOrCreateDirectSchema,
  sendMessageSchema,
} from "@/lib/validations/chat";
import {
  ALLOWED_MIME_TYPES,
  isAllowedMime,
  uploadedAttachmentSchema,
} from "@/lib/validations/media";
import { createPostSchema, editPostSchema } from "@/lib/validations/post";

// cuid de ejemplo (formato que acepta z.cuid).
const CUID = "clh2x9k8b0000qzrm1a2b3c4d";

describe("post: createPostSchema", () => {
  it("acepta un post con contenido", () => {
    const r = createPostSchema.safeParse({ content: "Hola equipo" });
    expect(r.success).toBe(true);
  });

  it("acepta un post SOLO con imagen (sin contenido)", () => {
    const r = createPostSchema.safeParse({
      attachments: [
        {
          url: "/api/files/x.png",
          key: "x.png",
          mime: "image/png",
          size: 1234,
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rechaza un post totalmente vacío (sin contenido ni adjuntos)", () => {
    const r = createPostSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("rechaza contenido solo-espacios (trim → vacío) sin adjuntos", () => {
    const r = createPostSchema.safeParse({ content: "   " });
    expect(r.success).toBe(false);
  });

  it("rechaza contenido por encima del máximo (5000)", () => {
    const r = createPostSchema.safeParse({ content: "a".repeat(5001) });
    expect(r.success).toBe(false);
  });

  it("editPostSchema exige cuid válido y contenido no vacío", () => {
    expect(editPostSchema.safeParse({ id: CUID, content: "x" }).success).toBe(
      true,
    );
    expect(
      editPostSchema.safeParse({ id: "no-cuid", content: "x" }).success,
    ).toBe(false);
    expect(editPostSchema.safeParse({ id: CUID, content: "" }).success).toBe(
      false,
    );
  });
});

describe("media: uploadedAttachmentSchema", () => {
  it("acepta un adjunto bien formado", () => {
    const r = uploadedAttachmentSchema.safeParse({
      url: "/api/files/a.png",
      key: "a.png",
      mime: "image/png",
      size: 100,
      width: 640,
      height: 480,
    });
    expect(r.success).toBe(true);
  });

  it("rechaza MIME no permitido", () => {
    const r = uploadedAttachmentSchema.safeParse({
      url: "/x",
      key: "k",
      mime: "application/x-msdownload",
      size: 10,
    });
    expect(r.success).toBe(false);
  });

  it("rechaza tamaño no positivo o por encima del máximo", () => {
    const base = { url: "/x", key: "k", mime: "image/png" as const };
    expect(
      uploadedAttachmentSchema.safeParse({ ...base, size: 0 }).success,
    ).toBe(false);
    expect(
      uploadedAttachmentSchema.safeParse({ ...base, size: 6 * 1024 * 1024 })
        .success,
    ).toBe(false);
  });

  it("isAllowedMime coincide con la lista cerrada", () => {
    for (const mime of ALLOWED_MIME_TYPES)
      expect(isAllowedMime(mime)).toBe(true);
    expect(isAllowedMime("image/svg+xml")).toBe(false);
  });
});

describe("admin: roles y alta de empleados", () => {
  it("appRoleSchema acepta los tres roles y rechaza otros", () => {
    expect(appRoleSchema.safeParse("admin").success).toBe(true);
    expect(appRoleSchema.safeParse("moderator").success).toBe(true);
    expect(appRoleSchema.safeParse("user").success).toBe(true);
    expect(appRoleSchema.safeParse("superadmin").success).toBe(false);
  });

  it("employeeRoleSchema NO admite 'admin' (alta no crea admins)", () => {
    expect(employeeRoleSchema.safeParse("user").success).toBe(true);
    expect(employeeRoleSchema.safeParse("moderator").success).toBe(true);
    expect(employeeRoleSchema.safeParse("admin").success).toBe(false);
  });

  it("createEmployeeSchema valida email/nombre y aplica rol por defecto 'user'", () => {
    const r = createEmployeeSchema.safeParse({
      email: "nuevo@corelink.test",
      name: "Nuevo Empleado",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.role).toBe("user");
  });

  it("createEmployeeSchema rechaza email inválido y nombre corto", () => {
    expect(
      createEmployeeSchema.safeParse({ email: "no-es-email", name: "Ok" })
        .success,
    ).toBe(false);
    expect(
      createEmployeeSchema.safeParse({ email: "a@b.com", name: "A" }).success,
    ).toBe(false);
  });
});

describe("chat: esquemas", () => {
  it("getOrCreateDirectSchema exige otherUserId no vacío", () => {
    expect(
      getOrCreateDirectSchema.safeParse({ otherUserId: "usr_1" }).success,
    ).toBe(true);
    expect(getOrCreateDirectSchema.safeParse({ otherUserId: "" }).success).toBe(
      false,
    );
  });

  it("createGroupSchema exige nombre y al menos un miembro", () => {
    expect(
      createGroupSchema.safeParse({ name: "Equipo", memberIds: ["usr_1"] })
        .success,
    ).toBe(true);
    expect(
      createGroupSchema.safeParse({ name: "Equipo", memberIds: [] }).success,
    ).toBe(false);
    expect(
      createGroupSchema.safeParse({ name: "", memberIds: ["usr_1"] }).success,
    ).toBe(false);
  });

  it("sendMessageSchema permite solo-imagen pero no totalmente vacío", () => {
    expect(
      sendMessageSchema.safeParse({ conversationId: CUID, content: "hola" })
        .success,
    ).toBe(true);
    expect(
      sendMessageSchema.safeParse({
        conversationId: CUID,
        attachments: [{ url: "/x", key: "k", mime: "image/png", size: 10 }],
      }).success,
    ).toBe(true);
    expect(sendMessageSchema.safeParse({ conversationId: CUID }).success).toBe(
      false,
    );
  });
});

describe("auth: login y cambio de contraseña", () => {
  it("loginSchema valida email y longitud mínima de contraseña", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "12345678" }).success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "corto" }).success,
    ).toBe(false);
  });

  it("changePasswordSchema exige que la nueva sea distinta de la actual", () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "vieja-1234",
        newPassword: "nueva-1234",
      }).success,
    ).toBe(true);
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "igual-1234",
        newPassword: "igual-1234",
      }).success,
    ).toBe(false);
  });
});
