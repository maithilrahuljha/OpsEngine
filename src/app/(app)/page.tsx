import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { cadets, cbtScores, disciplinaryLogs, vivaScores, leads } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TOTAL_BEDS = 40;

export default async function CommandCenter() {
  const session = await getSession();

  const [cadetStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      housed: sql<number>`count(*) filter (where ${cadets.hostelRoom} is not null)::int`,
      medPassed: sql<number>`count(*) filter (where ${cadets.medicalStatus} = 'PASSED')::int`,
      medScreened: sql<number>`count(*) filter (where ${cadets.medicalStatus} != 'PENDING')::int`,
    })
    .from(cadets)
    .where(eq(cadets.isDeleted, false));

  const [cbtStats] = await db
    .select({ avg: sql<number>`coalesce(round(avg(${cbtScores.totalScore})::numeric, 1), 0)::float` })
    .from(cbtScores);

  const batchRows = await db
    .select({ batch: cadets.batch, count: sql<number>`count(*)::int` })
    .from(cadets)
    .where(eq(cadets.isDeleted, false))
    .groupBy(cadets.batch);

  const topRanks = await db
    .select({
      rank: cbtScores.allIndiaRank,
      total: cbtScores.totalScore,
      exam: cbtScores.examTitle,
      name: cadets.fullName,
      roll: cadets.rollNumber,
    })
    .from(cbtScores)
    .innerJoin(cadets, eq(cbtScores.cadetId, cadets.id))
    .orderBy(cbtScores.allIndiaRank)
    .limit(5);

  const recentIncidents = await db
    .select({
      id: disciplinaryLogs.id,
      incident: disciplinaryLogs.incident,
      severity: disciplinaryLogs.severity,
      name: cadets.fullName,
      createdAt: disciplinaryLogs.createdAt,
    })
    .from(disciplinaryLogs)
    .innerJoin(cadets, eq(disciplinaryLogs.cadetId, cadets.id))
    .orderBy(desc(disciplinaryLogs.createdAt))
    .limit(4);

  const vivaPipeline = await db
    .select({
      company: vivaScores.company,
      count: sql<number>`count(*)::int`,
      avg: sql<number>`round(avg((${vivaScores.technicalScore} + ${vivaScores.fluencyScore} + ${vivaScores.confidenceScore}) / 3)::numeric, 1)::float`,
    })
    .from(vivaScores)
    .groupBy(vivaScores.company)
    .orderBy(desc(sql`count(*)`));

  const medFailed = await db
    .select({ name: cadets.fullName, roll: cadets.rollNumber, status: cadets.medicalStatus })
    .from(cadets)
    .where(
      and(
        eq(cadets.isDeleted, false),
        sql`${cadets.medicalStatus} in ('FAILED_VISION', 'FAILED_COLOR_BLINDNESS')`
      )
    )
    .limit(4);

  const [crmStats] = await db
    .select({
      openPipeline: sql<number>`coalesce(sum(${leads.estimatedFee}) filter (where ${leads.stage} not in ('ENROLLED','LOST')), 0)::float`,
      openCount: sql<number>`count(*) filter (where ${leads.stage} not in ('ENROLLED','LOST'))::int`,
      wonCount: sql<number>`count(*) filter (where ${leads.stage} = 'ENROLLED')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(leads)
    .where(eq(leads.isArchived, false));

  const crmStageRows = await db
    .select({ stage: leads.stage, count: sql<number>`count(*)::int` })
    .from(leads)
    .where(eq(leads.isArchived, false))
    .groupBy(leads.stage);

  const occupancy = Math.round((cadetStats.housed / TOTAL_BEDS) * 100);
  const medPassPct =
    cadetStats.medScreened > 0
      ? Math.round((cadetStats.medPassed / cadetStats.medScreened) * 100)
      : 0;

  const kpis = [
    {
      label: "Active Cadets",
      value: String(cadetStats.total),
      sub: "Across ECHO · VICTOR · ELITE",
      icon: "🎖️",
      accent: "border-l-navy-700",
    },
    {
      label: "Hostel Occupancy",
      value: `${occupancy}%`,
      sub: `${cadetStats.housed} of ${TOTAL_BEDS} beds allocated`,
      icon: "🏢",
      accent: "border-l-gold-500",
    },
    {
      label: "Vision / Medical Pass",
      value: `${medPassPct}%`,
      sub: `${cadetStats.medPassed} fit of ${cadetStats.medScreened} screened`,
      icon: "🩺",
      accent: "border-l-emerald-500",
    },
    {
      label: "CBT Average Score",
      value: String(cbtStats.avg),
      sub: "Latest All-India mock series",
      icon: "📝",
      accent: "border-l-sky-500",
    },
  ];

  const batchTotal = batchRows.reduce((a, b) => a + b.count, 0) || 1;
  const batchColor: Record<string, string> = {
    ECHO: "bg-sky-500",
    VICTOR: "bg-violet-500",
    ELITE: "bg-gold-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-navy-900">Command Center</h1>
          <p className="text-sm text-slate-500">
            Live operational picture — welcome back, {session?.name.split(" ")[0]}.
          </p>
        </div>
        <span className="rounded-full bg-navy-900 px-3 py-1 text-[11px] font-bold text-gold-400">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`rounded-xl border border-slate-200 border-l-4 bg-white p-5 shadow-sm ${k.accent}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {k.label}
              </p>
              <span className="text-xl">{k.icon}</span>
            </div>
            <p className="mt-2 text-3xl font-black text-navy-900">{k.value}</p>
            <p className="mt-1 text-xs text-slate-500">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Admissions funnel snapshot */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-navy-900">Admissions Funnel</h2>
            <p className="text-xs text-slate-500">
              {crmStats.openCount} open leads ·{" "}
              <span className="font-bold text-gold-600">
                {crmStats.openPipeline >= 100000
                  ? `₹${(crmStats.openPipeline / 100000).toFixed(1)}L`
                  : `₹${Math.round(crmStats.openPipeline / 1000)}K`}
              </span>{" "}
              pipeline · {crmStats.wonCount} enrolled
            </p>
          </div>
          <Link href="/crm" className="text-xs font-bold text-gold-600 hover:underline">
            Open CRM →
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["NEW", "New", "bg-slate-100 text-slate-600"],
              ["CONTACTED", "Contacted", "bg-sky-50 text-sky-700"],
              ["QUALIFIED", "Qualified", "bg-indigo-50 text-indigo-700"],
              ["COUNSELING", "Counseling", "bg-violet-50 text-violet-700"],
              ["APPLICATION", "Application", "bg-amber-50 text-amber-700"],
              ["ADMITTED", "Admitted", "bg-teal-50 text-teal-700"],
              ["ENROLLED", "Enrolled", "bg-emerald-50 text-emerald-700"],
              ["LOST", "Lost", "bg-rose-50 text-rose-700"],
            ] as const
          ).map(([stage, label, cls]) => {
            const count = crmStageRows.find((r) => r.stage === stage)?.count ?? 0;
            return (
              <div
                key={stage}
                className={`flex min-w-[92px] flex-1 flex-col items-center rounded-lg px-3 py-2 ${cls}`}
              >
                <span className="text-lg font-black">{count}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Batch distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-navy-900">Batch Strength</h2>
          <p className="text-xs text-slate-500">Cadet distribution by batch</p>
          <div className="mt-5 space-y-4">
            {["ECHO", "VICTOR", "ELITE"].map((b) => {
              const row = batchRows.find((r) => r.batch === b);
              const count = row?.count ?? 0;
              const pct = Math.round((count / batchTotal) * 100);
              return (
                <div key={b}>
                  <div className="mb-1 flex justify-between text-xs font-semibold">
                    <span className="text-navy-900">Batch {b}</span>
                    <span className="text-slate-500">
                      {count} cadets · {pct}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${batchColor[b]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="mt-7 text-sm font-black text-navy-900">Sponsorship Pipeline</h2>
          <div className="mt-3 space-y-2">
            {vivaPipeline.length === 0 && (
              <p className="text-xs text-slate-400">No viva evaluations recorded yet.</p>
            )}
            {vivaPipeline.map((v) => (
              <div
                key={v.company}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
              >
                <span className="text-xs font-bold text-navy-900">{v.company}</span>
                <span className="text-[11px] text-slate-500">
                  {v.count} vivas · avg{" "}
                  <span className="font-bold text-gold-600">{v.avg}/10</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AIR Leaderboard */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-navy-900">All-India Rank Board</h2>
              <p className="text-xs text-slate-500">Top CBT mock performers</p>
            </div>
            <Link href="/cbt" className="text-xs font-bold text-gold-600 hover:underline">
              View hub →
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {topRanks.length === 0 && (
              <p className="text-xs text-slate-400">No CBT results published yet.</p>
            )}
            {topRanks.map((r) => (
              <div
                key={`${r.roll}-${r.rank}`}
                className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    r.rank === 1
                      ? "bg-gold-500 text-navy-900"
                      : r.rank <= 3
                        ? "bg-navy-900 text-gold-400"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  #{r.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-navy-900">{r.name}</p>
                  <p className="text-[10px] text-slate-400">{r.roll}</p>
                </div>
                <span className="text-sm font-black text-navy-900">{r.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts column */}
        <div className="space-y-6">
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
            <h2 className="text-sm font-black text-rose-800">⚠ Medical Blockers</h2>
            <p className="text-xs text-rose-600/80">
              Cadets barred from sponsorship tests pending DG Shipping standards
            </p>
            <div className="mt-3 space-y-2">
              {medFailed.length === 0 && (
                <p className="text-xs text-slate-500">No active medical failures. 🎉</p>
              )}
              {medFailed.map((m) => (
                <div
                  key={m.roll}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-bold text-navy-900">{m.name}</p>
                    <p className="text-[10px] text-slate-400">{m.roll}</p>
                  </div>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                    {m.status === "FAILED_VISION" ? "6/6 Vision" : "Ishihara"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-navy-900">Recent Incidents</h2>
              <Link href="/hostel" className="text-xs font-bold text-gold-600 hover:underline">
                Hostel desk →
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {recentIncidents.length === 0 && (
                <p className="text-xs text-slate-400">Clean sheet — no incidents logged.</p>
              )}
              {recentIncidents.map((i) => (
                <div key={i.id} className="rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-navy-900">{i.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        i.severity === "CRITICAL"
                          ? "bg-rose-100 text-rose-700"
                          : i.severity === "MEDIUM"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {i.severity}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">{i.incident}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
