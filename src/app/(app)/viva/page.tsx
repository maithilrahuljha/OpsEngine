import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cadets, vivaScores } from "@/db/schema";
import { getSession, canWrite } from "@/lib/auth";
import { VivaClient } from "./viva-client";

export const dynamic = "force-dynamic";

export default async function VivaPage() {
  const session = await getSession();

  const vivas = await db
    .select({
      id: vivaScores.id,
      cadetId: vivaScores.cadetId,
      company: vivaScores.company,
      technicalScore: vivaScores.technicalScore,
      fluencyScore: vivaScores.fluencyScore,
      confidenceScore: vivaScores.confidenceScore,
      evaluatorName: vivaScores.evaluatorName,
      remarks: vivaScores.remarks,
      createdAt: vivaScores.createdAt,
      cadetName: cadets.fullName,
      roll: cadets.rollNumber,
      medicalStatus: cadets.medicalStatus,
    })
    .from(vivaScores)
    .innerJoin(cadets, eq(vivaScores.cadetId, cadets.id))
    .where(eq(cadets.isDeleted, false))
    .orderBy(desc(vivaScores.createdAt));

  const roster = await db
    .select({
      id: cadets.id,
      fullName: cadets.fullName,
      rollNumber: cadets.rollNumber,
      medicalStatus: cadets.medicalStatus,
    })
    .from(cadets)
    .where(eq(cadets.isDeleted, false))
    .orderBy(cadets.rollNumber);

  return (
    <VivaClient
      vivas={vivas}
      roster={roster}
      canEdit={session ? canWrite(session.role, "viva") : false}
    />
  );
}
