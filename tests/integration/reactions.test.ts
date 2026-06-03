import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { toggleReaction } from "@/server/reaction-actions";
import { createPostRow, createUser } from "./_helpers/fixtures";
import { runAs } from "./_helpers/session";
import "./_helpers/setup";

describe("toggleReaction", () => {
  it("añade una reacción si no existía y la quita al repetir (idempotente)", async () => {
    const author = await createUser();
    const reactor = await createUser();
    const post = await createPostRow(author.id);

    const first = await runAs({ id: reactor.id }, () =>
      toggleReaction({ postId: post.id, type: "LIKE" }),
    );
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.data.viewerReaction).toContain("LIKE");
    expect(
      await prisma.reaction.count({
        where: { postId: post.id, userId: reactor.id, type: "LIKE" },
      }),
    ).toBe(1);

    const second = await runAs({ id: reactor.id }, () =>
      toggleReaction({ postId: post.id, type: "LIKE" }),
    );
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.data.viewerReaction).not.toContain("LIKE");
    expect(
      await prisma.reaction.count({
        where: { postId: post.id, userId: reactor.id },
      }),
    ).toBe(0);
  });

  it("permite varios tipos de reacción del mismo usuario y los devuelve como array", async () => {
    const author = await createUser();
    const reactor = await createUser();
    const post = await createPostRow(author.id);

    await runAs({ id: reactor.id }, () =>
      toggleReaction({ postId: post.id, type: "LIKE" }),
    );
    const res = await runAs({ id: reactor.id }, () =>
      toggleReaction({ postId: post.id, type: "CELEBRATE" }),
    );

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(Array.isArray(res.data.viewerReaction)).toBe(true);
      expect(res.data.viewerReaction).toEqual(
        expect.arrayContaining(["LIKE", "CELEBRATE"]),
      );
    }
  });

  it("crea notificación REACTION al autor (no a uno mismo)", async () => {
    const author = await createUser();
    const reactor = await createUser();
    const post = await createPostRow(author.id);

    await runAs({ id: reactor.id }, () =>
      toggleReaction({ postId: post.id, type: "LIKE" }),
    );

    const notifs = await prisma.notification.findMany({
      where: { userId: author.id, type: "REACTION" },
    });
    expect(notifs).toHaveLength(1);
    expect(notifs[0]?.actorId).toBe(reactor.id);
  });

  it("rechaza reaccionar sin sesión", async () => {
    const author = await createUser();
    const post = await createPostRow(author.id);
    const res = await toggleReaction({ postId: post.id, type: "LIKE" });
    expect(res.ok).toBe(false);
  });
});
