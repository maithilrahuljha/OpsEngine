import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import type { Session } from "@/lib/auth-shared";

export type { Role, Session, Resource } from "@/lib/auth-shared";
export { canWrite, ROLE_LABELS } from "@/lib/auth-shared";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "paramount-opsengine-dev-secret-key-2026"
);

export const COOKIE_NAME = "ops_session";

export function hashPassword(password: string): string {
  return createHash("sha256").update(`paramount::${password}`).digest("hex");
}

export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function getSession(): Promise<Session | null> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return {
      userId: payload.userId as number,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Session["role"],
      campus: payload.campus as string,
    };
  } catch {
    return null;
  }
}
