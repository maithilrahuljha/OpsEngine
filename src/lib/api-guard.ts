import { NextResponse } from "next/server";
import { getSession, canWrite, type Resource, type Session } from "@/lib/auth";

export async function requireSession(): Promise<
  { session: Session; error: null } | { session: null; error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, error: null };
}

export async function requireWrite(
  resource: Resource
): Promise<
  { session: Session; error: null } | { session: null; error: NextResponse }
> {
  const result = await requireSession();
  if (result.error) return result;
  if (!canWrite(result.session.role, resource)) {
    return {
      session: null,
      error: NextResponse.json(
        { error: `Your role does not have write access to ${resource}.` },
        { status: 403 }
      ),
    };
  }
  return result;
}
