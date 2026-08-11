import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { rollCalls } from "@/db/schema";
import { requireWrite } from "@/lib/api-guard";

// Toggle today's roll-call state for a cadet (upsert)
export async function POST(req: NextRequest) {
  const { session, error } = await requireWrite("attendance");
  if (error) return error;

  try {
    const { cadetId, date, present } = await req.json();
    const cid = Number(cadetId);
    const day = date || new Date().toISOString().slice(0, 10);
    if (Number.isNaN(cid)) {
      return NextResponse.json({ error: "Invalid cadet id." }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(rollCalls)
      .where(and(eq(rollCalls.cadetId, cid), eq(rollCalls.date, day)));

    if (existing) {
      const [updated] = await db
        .update(rollCalls)
        .set({ present: Boolean(present), markedBy: session.name })
        .where(eq(rollCalls.id, existing.id))
        .returning();
      return NextResponse.json({ rollCall: updated });
    }

    const [created] = await db
      .insert(rollCalls)
      .values({ cadetId: cid, date: day, present: Boolean(present), markedBy: session.name })
      .returning();
    return NextResponse.json({ rollCall: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to mark attendance." }, { status: 500 });
  }
}
