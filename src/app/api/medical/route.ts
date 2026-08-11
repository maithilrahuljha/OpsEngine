import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cadets, medicalAudits } from "@/db/schema";
import { requireWrite } from "@/lib/api-guard";

// Create a medical audit (or upsert-like: always inserts a new audit row and
// syncs the cadet's medicalStatus based on the checks).
export async function POST(req: NextRequest) {
  const { session, error } = await requireWrite("medical");
  if (error) return error;

  try {
    const { cadetId, visionUnaided, ishiharaPassed, notes } = await req.json();
    const cid = Number(cadetId);
    if (Number.isNaN(cid)) {
      return NextResponse.json({ error: "Invalid cadet id." }, { status: 400 });
    }

    const [audit] = await db
      .insert(medicalAudits)
      .values({
        cadetId: cid,
        visionUnaided: Boolean(visionUnaided),
        ishiharaPassed: Boolean(ishiharaPassed),
        auditedBy: session.name,
        notes: notes || "",
      })
      .returning();

    const status = !visionUnaided
      ? "FAILED_VISION"
      : !ishiharaPassed
        ? "FAILED_COLOR_BLINDNESS"
        : "PASSED";

    await db.update(cadets).set({ medicalStatus: status }).where(eq(cadets.id, cid));

    return NextResponse.json({ audit, medicalStatus: status }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to record audit." }, { status: 500 });
  }
}

// Toggle an existing audit's checks
export async function PATCH(req: NextRequest) {
  const { error } = await requireWrite("medical");
  if (error) return error;

  try {
    const { auditId, visionUnaided, ishiharaPassed } = await req.json();
    const updates: Record<string, boolean> = {};
    if (typeof visionUnaided === "boolean") updates.visionUnaided = visionUnaided;
    if (typeof ishiharaPassed === "boolean") updates.ishiharaPassed = ishiharaPassed;

    const [audit] = await db
      .update(medicalAudits)
      .set(updates)
      .where(eq(medicalAudits.id, Number(auditId)))
      .returning();

    if (!audit) {
      return NextResponse.json({ error: "Audit not found." }, { status: 404 });
    }

    const status = !audit.visionUnaided
      ? "FAILED_VISION"
      : !audit.ishiharaPassed
        ? "FAILED_COLOR_BLINDNESS"
        : "PASSED";

    await db
      .update(cadets)
      .set({ medicalStatus: status })
      .where(eq(cadets.id, audit.cadetId));

    return NextResponse.json({ audit, medicalStatus: status });
  } catch {
    return NextResponse.json({ error: "Failed to update audit." }, { status: 500 });
  }
}
