import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leads, leadActivities } from "@/db/schema";
import { requireWrite } from "@/lib/api-guard";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireWrite("crm");
  if (error) return error;

  const { id } = await ctx.params;
  const leadId = Number(id);
  if (Number.isNaN(leadId)) {
    return NextResponse.json({ error: "Invalid lead id." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const [existing] = await db.select().from(leads).where(eq(leads.id, leadId));
    if (!existing) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const allowed = [
      "fullName",
      "email",
      "phone",
      "city",
      "stage",
      "source",
      "interestedStream",
      "interestedBatch",
      "owner",
      "estimatedFee",
      "score",
      "notes",
      "nextFollowUp",
    ] as const;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const [updated] = await db
      .update(leads)
      .set(updates)
      .where(eq(leads.id, leadId))
      .returning();

    // Auto-log a stage change as an activity
    if (body.stage && body.stage !== existing.stage) {
      await db.insert(leadActivities).values({
        leadId,
        type: "NOTE",
        summary: `Stage moved: ${existing.stage} → ${body.stage}.`,
        createdBy: session.name,
      });
    }

    return NextResponse.json({ lead: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update lead." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error } = await requireWrite("crm");
  if (error) return error;

  const { id } = await ctx.params;
  const leadId = Number(id);
  if (Number.isNaN(leadId)) {
    return NextResponse.json({ error: "Invalid lead id." }, { status: 400 });
  }

  try {
    const [updated] = await db
      .update(leads)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to archive lead." }, { status: 500 });
  }
}
