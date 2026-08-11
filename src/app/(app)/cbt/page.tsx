import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { cadets, cbtScores } from "@/db/schema";
import { getSession, canWrite } from "@/lib/auth";
import { CbtClient } from "./cbt-client";

export const dynamic = "force-dynamic";

export default async function CbtPage() {
  const session = await getSession();

  const scores = await db
    .select({
      id: cbtScores.id,
      cadetId: cbtScores.cadetId,
      examTitle: cbtScores.examTitle,
      physics: cbtScores.physics,
      chemistry: cbtScores.chemistry,
      math: cbtScores.math,
      totalScore: cbtScores.totalScore,
      allIndiaRank: cbtScores.allIndiaRank,
      createdAt: cbtScores.createdAt,
      cadetName: cadets.fullName,
      roll: cadets.rollNumber,
      batch: cadets.batch,
    })
    .from(cbtScores)
    .innerJoin(cadets, eq(cbtScores.cadetId, cadets.id))
    .orderBy(asc(cbtScores.allIndiaRank));

  const [topicAvg] = await db
    .select({
      physics: sql<number>`coalesce(round(avg(${cbtScores.physics})::numeric, 1), 0)::float`,
      chemistry: sql<number>`coalesce(round(avg(${cbtScores.chemistry})::numeric, 1), 0)::float`,
      math: sql<number>`coalesce(round(avg(${cbtScores.math})::numeric, 1), 0)::float`,
      total: sql<number>`coalesce(round(avg(${cbtScores.totalScore})::numeric, 1), 0)::float`,
    })
    .from(cbtScores);

  const roster = await db
    .select({ id: cadets.id, fullName: cadets.fullName, rollNumber: cadets.rollNumber })
    .from(cadets)
    .where(eq(cadets.isDeleted, false))
    .orderBy(cadets.rollNumber);

  return (
    <CbtClient
      scores={scores}
      topicAvg={topicAvg}
      roster={roster}
      canEdit={session ? canWrite(session.role, "cbt") : false}
    />
  );
}
