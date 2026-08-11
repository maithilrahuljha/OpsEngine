import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { COOKIE_NAME, createSessionToken, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, String(email).toLowerCase().trim()));

    if (!user || user.passwordHash !== hashPassword(password)) {
      return NextResponse.json(
        { error: "Invalid credentials. Access denied." },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
      campus: user.campus,
    });

    const res = NextResponse.json({
      ok: true,
      user: { name: user.fullName, role: user.role },
    });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
