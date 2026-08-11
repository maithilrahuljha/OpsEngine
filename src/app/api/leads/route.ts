import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads, leadActivities } from "@/db/schema";
import { requireWrite } from "@/lib/api-guard";

export async function POST(req: NextRequest) {
  const { session, error } = await requireWrite("crm");
  if (error) return error;

  try {
    const body = await req.json();
    const {
      fullName,
      email,
      phone,
      city,
      source,
      interestedStream,
      interestedBatch,
      owner,
      estimatedFee,
      score,
      notes,
      nextFollowUp,
    } = body;

    if (!fullName || !phone) {
      return NextResponse.json(
        { error: "Prospect name and phone are required." },
        { status: 400 }
      );
    }

    const [lead] = await db
      .insert(leads)
      .values({
        fullName,
        email: email || "",
        phone,
        city: city || "",
        source: source || "WEBSITE",
        interestedStream: interestedStream || "DNS_OFFICER",
        interestedBatch: interestedBatch || "ECHO",
        owner: owner || session.name,
        campus: session.campus,
        estimatedFee: Number(estimatedFee) || 0,
        score: Math.min(100, Math.max(0, Number(score) || 50)),
        notes: notes || "",
        nextFollowUp: nextFollowUp || null,
      })
      .returning();

    await db.insert(leadActivities).values({
      leadId: lead.id,
      type: "NOTE",
      summary: `Lead created via ${lead.source.replace(/_/g, " ").toLowerCase()} and assigned to ${lead.owner}.`,
      createdBy: session.name,
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create lead." }, { status: 500 });
  }
}
