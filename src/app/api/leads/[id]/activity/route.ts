import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leads, leadActivities } from "@/db/schema";
import { requireWrite } from "@/lib/api-guard";

export async function POST(
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
    const { type, summary, nextFollowUp } = await req.json();
    if (!summary) {
      return NextResponse.json({ error: "Activity summary is required." }, { status: 400 });
    }

    const [activity] = await db
      .insert(leadActivities)
      .values({
        leadId,
        type: type || "NOTE",
        summary,
        createdBy: session.name,
      })
      .returning();

    // Touch the lead + optionally set next follow-up
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (nextFollowUp) updates.nextFollowUp = nextFollowUp;
    await db.update(leads).set(updates).where(eq(leads.id, leadId));

    return NextResponse.json({ activity }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to log activity." }, { status: 500 });
  }
}
