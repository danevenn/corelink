import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { buildMentionToken } from "@/lib/mention-token";
import {
  getOrCreateDirectConversation,
  sendMessage,
} from "@/server/chat-actions";
import { createUser } from "./_helpers/fixtures";
import { runAs } from "./_helpers/session";
import "./_helpers/setup";

describe("getOrCreateDirectConversation", () => {
  it("es idempotente: dos llamadas devuelven el MISMO DM (no duplica)", async () => {
    const a = await createUser();
    const b = await createUser();

    const first = await runAs({ id: a.id }, () =>
      getOrCreateDirectConversation({ otherUserId: b.id }),
    );
    const second = await runAs({ id: a.id }, () =>
      getOrCreateDirectConversation({ otherUserId: b.id }),
    );

    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.data.conversationId).toBe(second.data.conversationId);
    }
    expect(await prisma.conversation.count({ where: { type: "DIRECT" } })).toBe(
      1,
    );
  });

  it("rechaza abrir un DM consigo mismo", async () => {
    const a = await createUser();
    const res = await runAs({ id: a.id }, () =>
      getOrCreateDirectConversation({ otherUserId: a.id }),
    );
    expect(res.ok).toBe(false);
  });
});

describe("sendMessage", () => {
  it("solo los miembros pueden enviar; un no-miembro es rechazado", async () => {
    const a = await createUser();
    const b = await createUser();
    const outsider = await createUser();

    const dm = await runAs({ id: a.id }, () =>
      getOrCreateDirectConversation({ otherUserId: b.id }),
    );
    expect(dm.ok).toBe(true);
    if (!dm.ok) return;
    const conversationId = dm.data.conversationId;

    const ok = await runAs({ id: a.id }, () =>
      sendMessage({ conversationId, content: "hola B" }),
    );
    expect(ok.ok).toBe(true);

    const denied = await runAs({ id: outsider.id }, () =>
      sendMessage({ conversationId, content: "intruso" }),
    );
    expect(denied.ok).toBe(false);

    expect(await prisma.message.count({ where: { conversationId } })).toBe(1);
  });

  it("mención a un MIEMBRO crea Mention + notificación", async () => {
    const a = await createUser();
    const b = await createUser({ displayName: "Bea" });

    const dm = await runAs({ id: a.id }, () =>
      getOrCreateDirectConversation({ otherUserId: b.id }),
    );
    if (!dm.ok) return;

    const content = `Hola ${buildMentionToken("Bea", b.id)}`;
    const res = await runAs({ id: a.id }, () =>
      sendMessage({ conversationId: dm.data.conversationId, content }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const mentions = await prisma.mention.findMany({
      where: { messageId: res.data.message.id },
    });
    expect(mentions).toHaveLength(1);
    expect(mentions[0]?.mentionedUserId).toBe(b.id);

    const notif = await prisma.notification.findMany({
      where: { userId: b.id, type: "MENTION", actorId: a.id },
    });
    expect(notif).toHaveLength(1);
  });

  it("mención a un NO-miembro de la conversación se descarta (sin Mention ni notif)", async () => {
    const a = await createUser();
    const b = await createUser();
    const stranger = await createUser({ displayName: "Ajeno" });

    const dm = await runAs({ id: a.id }, () =>
      getOrCreateDirectConversation({ otherUserId: b.id }),
    );
    if (!dm.ok) return;

    const content = `Mira ${buildMentionToken("Ajeno", stranger.id)}`;
    const res = await runAs({ id: a.id }, () =>
      sendMessage({ conversationId: dm.data.conversationId, content }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(
      await prisma.mention.count({ where: { messageId: res.data.message.id } }),
    ).toBe(0);
    expect(
      await prisma.notification.count({
        where: { userId: stranger.id, type: "MENTION" },
      }),
    ).toBe(0);
  });
});
