import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { setPostOfficial } from "@/server/official-actions";
import { createPost, deletePost } from "@/server/post-actions";
import { createPostRow, createUser } from "./_helpers/fixtures";
import { runAs } from "./_helpers/session";
import "./_helpers/setup";

describe("createPost", () => {
  it("crea un post con contenido para el usuario autenticado", async () => {
    const author = await createUser();

    const res = await runAs({ id: author.id }, () =>
      createPost({ content: "Mi primer post" }),
    );

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const post = await prisma.post.findUnique({ where: { id: res.data.id } });
    expect(post?.content).toBe("Mi primer post");
    expect(post?.authorId).toBe(author.id);
  });

  it("permite un post SOLO con imagen (sin contenido)", async () => {
    const author = await createUser();

    const res = await runAs({ id: author.id }, () =>
      createPost({
        attachments: [
          {
            url: "/api/files/foto.png",
            key: "foto.png",
            mime: "image/png",
            size: 2048,
          },
        ],
      }),
    );

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const attachments = await prisma.attachment.findMany({
      where: { postId: res.data.id },
    });
    expect(attachments).toHaveLength(1);
    expect(attachments[0]?.mime).toBe("image/png");
  });

  it("rechaza contenido vacío sin adjuntos (validación)", async () => {
    const author = await createUser();
    const res = await runAs({ id: author.id }, () =>
      createPost({ content: "   " }),
    );
    expect(res.ok).toBe(false);
  });

  it("rechaza si no hay sesión", async () => {
    const res = await createPost({ content: "hola" });
    expect(res.ok).toBe(false);
  });
});

describe("setPostOfficial (permisos)", () => {
  it("admin puede marcar un post como oficial", async () => {
    const admin = await createUser({ role: "admin" });
    const author = await createUser();
    const post = await createPostRow(author.id);

    const res = await runAs({ id: admin.id, role: "admin" }, () =>
      setPostOfficial(post.id, true),
    );

    expect(res.ok).toBe(true);
    const updated = await prisma.post.findUnique({ where: { id: post.id } });
    expect(updated?.isOfficial).toBe(true);
  });

  it("moderator puede marcar oficial", async () => {
    const mod = await createUser({ role: "moderator" });
    const author = await createUser();
    const post = await createPostRow(author.id);

    const res = await runAs({ id: mod.id, role: "moderator" }, () =>
      setPostOfficial(post.id, true),
    );
    expect(res.ok).toBe(true);
  });

  it("user normal es rechazado y el post NO cambia", async () => {
    const user = await createUser({ role: "user" });
    const author = await createUser();
    const post = await createPostRow(author.id);

    const res = await runAs({ id: user.id, role: "user" }, () =>
      setPostOfficial(post.id, true),
    );

    expect(res.ok).toBe(false);
    const updated = await prisma.post.findUnique({ where: { id: post.id } });
    expect(updated?.isOfficial).toBe(false);
  });

  it("anónimo (sin sesión) es rechazado", async () => {
    const author = await createUser();
    const post = await createPostRow(author.id);
    const res = await setPostOfficial(post.id, true);
    expect(res.ok).toBe(false);
  });
});

describe("deletePost (autor o staff)", () => {
  it("el autor puede borrar su propio post", async () => {
    const author = await createUser();
    const post = await createPostRow(author.id);

    const res = await runAs({ id: author.id, role: "user" }, () =>
      deletePost(post.id),
    );

    expect(res.ok).toBe(true);
    expect(await prisma.post.findUnique({ where: { id: post.id } })).toBeNull();
  });

  it("un moderador puede borrar el post de otro (moderación)", async () => {
    const author = await createUser();
    const mod = await createUser({ role: "moderator" });
    const post = await createPostRow(author.id);

    const res = await runAs({ id: mod.id, role: "moderator" }, () =>
      deletePost(post.id),
    );

    expect(res.ok).toBe(true);
    expect(await prisma.post.findUnique({ where: { id: post.id } })).toBeNull();
  });

  it("un tercero (user normal, no autor) NO puede borrar", async () => {
    const author = await createUser();
    const other = await createUser({ role: "user" });
    const post = await createPostRow(author.id);

    const res = await runAs({ id: other.id, role: "user" }, () =>
      deletePost(post.id),
    );

    expect(res.ok).toBe(false);
    expect(
      await prisma.post.findUnique({ where: { id: post.id } }),
    ).not.toBeNull();
  });
});
