import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { followUser, unfollowUser } from "@/server/follow-actions";
import { searchPosts, searchUsers } from "@/server/search";
import { createPostRow, createUser } from "./_helpers/fixtures";
import { runAs } from "./_helpers/session";
import "./_helpers/setup";

describe("follow / unfollow (idempotente)", () => {
  it("seguir dos veces deja un solo follow; rechaza auto-follow", async () => {
    const a = await createUser();
    const b = await createUser();

    await runAs({ id: a.id }, () => followUser(b.id));
    await runAs({ id: a.id }, () => followUser(b.id));
    expect(
      await prisma.follow.count({
        where: { followerId: a.id, followingId: b.id },
      }),
    ).toBe(1);

    const self = await runAs({ id: a.id }, () => followUser(a.id));
    expect(self.ok).toBe(false);

    await runAs({ id: a.id }, () => unfollowUser(b.id));
    expect(
      await prisma.follow.count({
        where: { followerId: a.id, followingId: b.id },
      }),
    ).toBe(0);
  });
});

describe("búsqueda FTS (search_vector)", () => {
  it("searchPosts encuentra por contenido (ranking español)", async () => {
    const viewer = await createUser();
    const author = await createUser();
    await createPostRow(author.id, {
      content: "Política de vacaciones y días libres del equipo",
    });
    await createPostRow(author.id, { content: "Receta de tortilla" });

    const res = await runAs({ id: viewer.id }, () => searchPosts("vacaciones"));
    expect(res.posts.length).toBeGreaterThanOrEqual(1);
    expect(res.posts.some((p) => p.content.includes("vacaciones"))).toBe(true);
  });

  it("searchUsers encuentra por perfil (displayName/jobTitle)", async () => {
    const viewer = await createUser();
    await createUser({
      displayName: "Manuela Operaciones",
      jobTitle: "Operations Manager",
    });

    const res = await runAs({ id: viewer.id }, () => searchUsers("Manager"));
    expect(res.length).toBeGreaterThanOrEqual(1);
  });
});
