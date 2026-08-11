import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { leads, leadActivities, cadets } from "@/db/schema";
import { requireWrite } from "@/lib/api-guard";

// Convert a won lead into an enrolled cadet.
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
    const { pcmPercentage, englishScore } = await req.json();
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    if (lead.convertedCadetId) {
      return NextResponse.json(
        { error: "This lead has already been converted to a cadet." },
        { status: 409 }
      );
    }

    // Generate the next roll number
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cadets);
    const rollNumber = `PMI-2026-${String(Number(count) + 1).padStart(3, "0")}`;

    const email =
      lead.email ||
      `${lead.fullName.split(" ")[0].toLowerCase()}.${Number(count) + 1}@cadet.paramount.in`;

    const [cadet] = await db
      .insert(cadets)
      .values({
        rollNumber,
        fullName: lead.fullName,
        email,
        phone: lead.phone,
        batch: lead.interestedBatch,
        stream: lead.interestedStream,
        campus: lead.campus,
        pcmPercentage: Number(pcmPercentage) || 0,
        englishScore: Number(englishScore) || 0,
        medicalStatus: "PENDING",
      })
      .returning();

    await db
      .update(leads)
      .set({ stage: "ENROLLED", convertedCadetId: cadet.id, updatedAt: new Date() })
      .where(eq(leads.id, leadId));

    await db.insert(leadActivities).values({
      leadId,
      type: "NOTE",
      summary: `🎉 Converted to enrolled cadet ${rollNumber} by ${session.name}.`,
      createdBy: session.name,
    });

    return NextResponse.json({ cadet }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("duplicate key")) {
      return NextResponse.json(
        { error: "A cadet with this email already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to convert lead." }, { status: 500 });
  }
}
