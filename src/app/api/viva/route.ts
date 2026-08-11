import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vivaScores } from "@/db/schema";
import { requireWrite } from "@/lib/api-guard";

export async function POST(req: NextRequest) {
  const { session, error } = await requireWrite("viva");
  if (error) return error;

  try {
    const { cadetId, company, technicalScore, fluencyScore, confidenceScore, remarks } =
      await req.json();

    const cid = Number(cadetId);
    if (Number.isNaN(cid) || !company) {
      return NextResponse.json(
        { error: "Cadet and company are required." },
        { status: 400 }
      );
    }

    const clamp = (v: unknown) => Math.min(10, Math.max(0, Number(v) || 0));

    const [score] = await db
      .insert(vivaScores)
      .values({
        cadetId: cid,
        company,
        technicalScore: clamp(technicalScore),
        fluencyScore: clamp(fluencyScore),
        confidenceScore: clamp(confidenceScore),
        evaluatorName: session.name,
        remarks: remarks || "",
      })
      .returning();

    return NextResponse.json({ score }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to record viva." }, { status: 500 });
  }
}
