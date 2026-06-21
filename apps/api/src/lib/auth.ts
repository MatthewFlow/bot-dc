import { jwtVerify } from "jose";
import { z } from "zod";

import { sessions } from "./sessions";

// Kształt naszego payloadu JWT — walidujemy go zamiast surowych rzutowań `as`.
const jwtPayloadSchema = z.object({
  userId: z.string().min(1),
  username: z.string(),
  avatar: z.string().nullish(),
});

export type AuthInfo = {
  userId: string;
  username: string;
  avatar: string | null;
  accessToken: string;
};

/**
 * Weryfikuje token JWT i dociąga access token z magazynu sesji. Zwraca `null`,
 * gdy token jest nieprawidłowy lub sesja wygasła. Współdzielone przez middleware
 * (nagłówek/cookie) i strumień SSE (token z query — EventSource nie ustawi nagłówka).
 */
export async function verifyToken(token: string): Promise<AuthInfo | null> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Brak JWT_SECRET w .env");
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const claims = jwtPayloadSchema.parse(payload);
    const accessToken = await sessions.get(claims.userId);
    if (!accessToken) return null;
    return {
      userId: claims.userId,
      username: claims.username,
      avatar: claims.avatar ?? null,
      accessToken,
    };
  } catch {
    return null;
  }
}
