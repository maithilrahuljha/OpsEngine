import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cadets, disciplinaryLogs, rollCalls } from "@/db/schema";
import { getSession, canWrite } from "@/lib/auth";
import { HostelClient } from "./hostel-client";

export const dynamic = "force-dynamic";

export default async function HostelPage() {
  const session = await getSession();
  const today = new Date().toISOString().slice(0, 10);

  const roster = await db
    .select()
    .from(cadets)
    .where(eq(cadets.isDeleted, false))
    .orderBy(cadets.rollNumber);

  const todayCalls = await db.select().from(rollCalls).where(and(eq(rollCalls.date, today)));

  const incidents = await db
    .select({
      id: disciplinaryLogs.id,
      cadetId: disciplinaryLogs.cadetId,
      incident: disciplinaryLogs.incident,
      severity: disciplinaryLogs.severity,
      actionTaken: disciplinaryLogs.actionTaken,
      createdAt: disciplinaryLogs.createdAt,
      cadetName: cadets.fullName,
      roll: cadets.rollNumber,
    })
    .from(disciplinaryLogs)
    .innerJoin(cadets, eq(disciplinaryLogs.cadetId, cadets.id))
    .orderBy(desc(disciplinaryLogs.createdAt));

  return (
    <HostelClient
      roster={roster}
      todayCalls={todayCalls}
      incidents={incidents}
      today={today}
      canAttendance={session ? canWrite(session.role, "attendance") : false}
      canDiscipline={session ? canWrite(session.role, "discipline") : false}
      canHostel={session ? canWrite(session.role, "hostel") : false}
    />
  );
}
