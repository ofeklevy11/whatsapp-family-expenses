import type { IncomingMessage } from "@/server/whatsapp/whatsapp-adapter.interface";
import type { findUserByPhone } from "@/server/services/user.service";

/** A registered user together with their family (as returned by findUserByPhone). */
export type RegisteredUser = NonNullable<
  Awaited<ReturnType<typeof findUserByPhone>>
>;

export interface HandlerContext {
  message: IncomingMessage;
  user: RegisteredUser;
  reply: (text: string) => Promise<void>;
}
