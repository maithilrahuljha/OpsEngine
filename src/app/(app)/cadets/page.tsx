import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { cadets } from "@/db/schema";
import { getSession, canWrite } from "@/lib/auth";
import { CadetsClient } from "./cadets-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function CadetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q : "";
  const batch = typeof params.batch === "string" ? params.batch : "";
  const stream = typeof params.stream === "string" ? params.stream : "";
  const medical = typeof params.medical === "string" ? params.medical : "";
  const sort = typeof params.sort === "string" ? params.sort : "rollNumber";
  const dir = params.dir === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number(params.page) || 1);

  const conditions: SQL[] = [eq(cadets.isDeleted, false)];
  if (q) {
    const cond = or(
      ilike(cadets.fullName, `%${q}%`),
      ilike(cadets.rollNumber, `%${q}%`),
      ilike(cadets.email, `%${q}%`)
    );
    if (cond) conditions.push(cond);
  }
  if (batch) conditions.push(sql`${cadets.batch} = ${batch}::batch_name`);
  if (stream) conditions.push(sql`${cadets.stream} = ${stream}::stream`);
  if (medical) conditions.push(sql`${cadets.medicalStatus} = ${medical}::medical_status`);

  const where = and(...conditions);

  const sortCol =
    sort === "fullName"
      ? cadets.fullName
      : sort === "pcmPercentage"
        ? cadets.pcmPercentage
        : sort === "batch"
          ? cadets.batch
          : cadets.rollNumber;

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cadets)
    .where(where);

  const rows = await db
    .select()
    .from(cadets)
    .where(where)
    .orderBy(dir === "desc" ? desc(sortCol) : asc(sortCol))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return (
    <CadetsClient
      cadets={rows}
      total={countRow.count}
      page={page}
      pageSize={PAGE_SIZE}
      filters={{ q, batch, stream, medical, sort, dir }}
      canEdit={session ? canWrite(session.role, "cadets") : false}
    />
  );
}
