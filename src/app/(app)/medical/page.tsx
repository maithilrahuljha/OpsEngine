import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cadets, medicalAudits } from "@/db/schema";
import { getSession, canWrite } from "@/lib/auth";
import { MedicalClient } from "./medical-client";

export const dynamic = "force-dynamic";

export default async function MedicalPage() {
  const session = await getSession();

  const audits = await db
    .select({
      id: medicalAudits.id,
      cadetId: medicalAudits.cadetId,
      visionUnaided: medicalAudits.visionUnaided,
      ishiharaPassed: medicalAudits.ishiharaPassed,
      auditedBy: medicalAudits.auditedBy,
      notes: medicalAudits.notes,
      createdAt: medicalAudits.createdAt,
      cadetName: cadets.fullName,
      roll: cadets.rollNumber,
      batch: cadets.batch,
      medicalStatus: cadets.medicalStatus,
    })
    .from(medicalAudits)
    .innerJoin(cadets, eq(medicalAudits.cadetId, cadets.id))
    .where(eq(cadets.isDeleted, false))
    .orderBy(desc(medicalAudits.createdAt));

  const roster = await db
    .select({ id: cadets.id, fullName: cadets.fullName, rollNumber: cadets.rollNumber })
    .from(cadets)
    .where(eq(cadets.isDeleted, false))
    .orderBy(cadets.rollNumber);

  return (
    <MedicalClient
      audits={audits}
      roster={roster}
      canEdit={session ? canWrite(session.role, "medical") : false}
    />
  );
}
