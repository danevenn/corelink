import { NotificationType } from "@/generated/prisma/enums";
import type { NotificationView } from "@/server/notifications";

// Helpers de presentación puros de notificaciones (sin estado, sin servidor).
// Traducen el `type` + actor + post a texto legible y al enlace del recurso.

/**
 * Texto legible de una notificación, en español.
 * El nombre del actor va aparte (se renderiza en negrita por el componente);
 * aquí devolvemos la ACCIÓN que sigue al nombre.
 */
export function notificationAction(type: NotificationType): string {
  switch (type) {
    case NotificationType.REPLY:
      return "respondió a tu publicación";
    case NotificationType.MENTION:
      return "te mencionó en una publicación";
    case NotificationType.REACTION:
      return "reaccionó a tu publicación";
    case NotificationType.FOLLOW:
      return "te empezó a seguir";
    case NotificationType.OFFICIAL_POST:
      return "marcó tu publicación como oficial";
    default:
      return "interactuó contigo";
  }
}

/**
 * Destino del enlace de una notificación:
 * - FOLLOW → perfil del actor (`/users/[actorId]`).
 * - resto → post relacionado (`/feed/[postId]`) si existe; si no, el perfil.
 */
export function notificationHref(notification: NotificationView): string {
  if (notification.type === NotificationType.FOLLOW) {
    return `/users/${notification.actor.id}`;
  }
  if (notification.post) {
    return `/feed/${notification.post.id}`;
  }
  return `/users/${notification.actor.id}`;
}
