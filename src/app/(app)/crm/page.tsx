import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { leads, leadActivities } from "@/db/schema";
import { getSession, canWrite } from "@/lib/auth";
import { CrmClient } from "./crm-client";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const session = await getSession();

  const leadRows = await db
    .select()
    .from(leads)
    .where(eq(leads.isArchived, false))
    .orderBy(desc(leads.updatedAt));

  const activities = await db
    .select()
    .from(leadActivities)
    .orderBy(desc(leadActivities.createdAt))
    .limit(400);

  const [stats] = await db
    .select({
      totalPipeline: sql<number>`coalesce(sum(${leads.estimatedFee}) filter (where ${leads.stage} not in ('ENROLLED','LOST')), 0)::float`,
      wonValue: sql<number>`coalesce(sum(${leads.estimatedFee}) filter (where ${leads.stage} = 'ENROLLED'), 0)::float`,
      openCount: sql<number>`count(*) filter (where ${leads.stage} not in ('ENROLLED','LOST'))::int`,
      wonCount: sql<number>`count(*) filter (where ${leads.stage} = 'ENROLLED')::int`,
      lostCount: sql<number>`count(*) filter (where ${leads.stage} = 'LOST')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(leads)
    .where(eq(leads.isArchived, false));

  return (
    <CrmClient
      leads={leadRows}
      activities={activities}
      stats={stats}
      currentUser={session?.name ?? ""}
      canEdit={session ? canWrite(session.role, "crm") : false}
    />
  );
}
