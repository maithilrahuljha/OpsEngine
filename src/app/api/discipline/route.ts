import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { disciplinaryLogs } from "@/db/schema";
import { requireWrite } from "@/lib/api-guard";

export async function POST(req: NextRequest) {
  const { error } = await requireWrite("discipline");
  if (error) return error;

  try {
    const { cadetId, incident, severity, actionTaken } = await req.json();
    const cid = Number(cadetId);
    if (Number.isNaN(cid) || !incident || !severity) {
      return NextResponse.json(
        { error: "Cadet, incident and severity are required." },
        { status: 400 }
      );
    }
    const [log] = await db
      .insert(disciplinaryLogs)
      .values({
        cadetId: cid,
        incident,
        severity,
        actionTaken: actionTaken || "Pending review",
      })
      .returning();
    return NextResponse.json({ log }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to log incident." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireWrite("discipline");
  if (error) return error;
  try {
    const { id } = await req.json();
    await db.delete(disciplinaryLogs).where(eq(disciplinaryLogs.id, Number(id)));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete log." }, { status: 500 });
  }
}
