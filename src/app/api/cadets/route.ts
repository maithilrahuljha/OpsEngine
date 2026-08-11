import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cadets } from "@/db/schema";
import { requireWrite } from "@/lib/api-guard";

const OFFICER_STREAMS = ["DNS_OFFICER", "BSC_NAUTICAL", "BTECH_MARINE"];

export async function POST(req: NextRequest) {
  const { error } = await requireWrite("cadets");
  if (error) return error;

  try {
    const body = await req.json();
    const {
      rollNumber,
      fullName,
      email,
      phone,
      batch,
      stream,
      hostelRoom,
      pcmPercentage,
      englishScore,
      campus,
    } = body;

    if (!rollNumber || !fullName || !email || !phone || !batch || !stream) {
      return NextResponse.json(
        { error: "All required fields must be filled." },
        { status: 400 }
      );
    }

    const pcm = Number(pcmPercentage);
    if (Number.isNaN(pcm) || pcm < 0 || pcm > 100) {
      return NextResponse.json(
        { error: "PCM percentage must be between 0 and 100." },
        { status: 400 }
      );
    }

    // DG Shipping eligibility rule: Officer streams require PCM > 60%
    if (OFFICER_STREAMS.includes(stream) && pcm <= 60) {
      return NextResponse.json(
        {
          error:
            "Eligibility violation: Officer streams (DNS / B.Sc / B.Tech) require PCM > 60% as per DG Shipping norms.",
        },
        { status: 422 }
      );
    }

    const [created] = await db
      .insert(cadets)
      .values({
        rollNumber,
        fullName,
        email: String(email).toLowerCase(),
        phone,
        batch,
        stream,
        hostelRoom: hostelRoom || null,
        pcmPercentage: pcm,
        englishScore: Number(englishScore) || 0,
        campus: campus || "Gwalior HQ",
      })
      .returning();

    return NextResponse.json({ cadet: created }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("duplicate key")) {
      return NextResponse.json(
        { error: "A cadet with this roll number or email already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to create cadet." }, { status: 500 });
  }
}
