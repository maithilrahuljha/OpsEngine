import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cadets } from "@/db/schema";
import { requireWrite } from "@/lib/api-guard";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  // Medical status toggles are owned by the medical desk; other edits by cadets resource.
  const body = await req.json();
  const isMedicalOnly =
    Object.keys(body).every((k) => k === "medicalStatus") && body.medicalStatus;

  const { error } = await requireWrite(isMedicalOnly ? "medical" : "cadets");
  if (error) return error;

  const { id } = await ctx.params;
  const cadetId = Number(id);
  if (Number.isNaN(cadetId)) {
    return NextResponse.json({ error: "Invalid cadet id." }, { status: 400 });
  }

  try {
    const allowed = [
      "fullName",
      "email",
      "phone",
      "batch",
      "stream",
      "hostelRoom",
      "medicalStatus",
      "pcmPercentage",
      "englishScore",
      "campus",
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields provided." }, { status: 400 });
    }

    const [updated] = await db
      .update(cadets)
      .set(updates)
      .where(eq(cadets.id, cadetId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Cadet not found." }, { status: 404 });
    }
    return NextResponse.json({ cadet: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update cadet." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error } = await requireWrite("cadets");
  if (error) return error;

  const { id } = await ctx.params;
  const cadetId = Number(id);
  if (Number.isNaN(cadetId)) {
    return NextResponse.json({ error: "Invalid cadet id." }, { status: 400 });
  }

  try {
    // Soft delete
    const [updated] = await db
      .update(cadets)
      .set({ isDeleted: true })
      .where(eq(cadets.id, cadetId))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Cadet not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete cadet." }, { status: 500 });
  }
}
