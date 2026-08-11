"use client";

import { useMemo, useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Lead, LeadActivity } from "@/db/schema";
import {
  Badge,
  Modal,
  Sheet,
  EmptyState,
  Field,
  inputCls,
  btnPrimary,
  btnGold,
  btnGhost,
  btnDanger,
  ReadOnlyBanner,
  STREAM_LABELS,
} from "@/components/ui";

const STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "COUNSELING",
  "APPLICATION",
  "ADMITTED",
  "ENROLLED",
  "LOST",
] as const;
type Stage = (typeof STAGES)[number];

const STAGE_META: Record<Stage, { label: string; dot: string; badge: string }> = {
  NEW: { label: "New Enquiry", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600 ring-slate-400/20" },
  CONTACTED: { label: "Contacted", dot: "bg-sky-400", badge: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  QUALIFIED: { label: "Qualified", dot: "bg-indigo-400", badge: "bg-indigo-50 text-indigo-700 ring-indigo-600/20" },
  COUNSELING: { label: "Counseling", dot: "bg-violet-400", badge: "bg-violet-50 text-violet-700 ring-violet-600/20" },
  APPLICATION: { label: "Application", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  ADMITTED: { label: "Admitted", dot: "bg-teal-400", badge: "bg-teal-50 text-teal-700 ring-teal-600/20" },
  ENROLLED: { label: "Enrolled (Won)", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  LOST: { label: "Lost", dot: "bg-rose-400", badge: "bg-rose-50 text-rose-700 ring-rose-600/20" },
};

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "Website",
  REFERRAL: "Referral",
  WALK_IN: "Walk-in",
  SOCIAL_MEDIA: "Social Media",
  EDUCATION_FAIR: "Education Fair",
  ADVERTISEMENT: "Advertisement",
  COLD_CALL: "Cold Call",
};

const ACTIVITY_ICON: Record<string, string> = {
  CALL: "📞",
  EMAIL: "✉️",
  MEETING: "🤝",
  WHATSAPP: "💬",
  NOTE: "📝",
  SITE_VISIT: "🏫",
};

function inr(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

const EMPTY_LEAD = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  source: "WEBSITE",
  interestedStream: "DNS_OFFICER",
  interestedBatch: "ECHO",
  owner: "",
  estimatedFee: "450000",
  score: "60",
  notes: "",
  nextFollowUp: "",
};

export function CrmClient({
  leads,
  activities,
  stats,
  currentUser,
  canEdit,
}: {
  leads: Lead[];
  activities: LeadActivity[];
  stats: {
    totalPipeline: number;
    wonValue: number;
    openCount: number;
    wonCount: number;
    lostCount: number;
    total: number;
  };
  currentUser: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [view, setView] = useState<"pipeline" | "table">("pipeline");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_LEAD });
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<Lead | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertForm, setConvertForm] = useState({ pcmPercentage: "", englishScore: "" });
  const [activityForm, setActivityForm] = useState({ type: "CALL", summary: "", nextFollowUp: "" });

  const [optimisticLeads, applyStage] = useOptimistic(
    leads,
    (state, patch: { id: number; stage: Stage }) =>
      state.map((l) => (l.id === patch.id ? { ...l, stage: patch.stage } : l))
  );

  const owners = useMemo(
    () => Array.from(new Set(leads.map((l) => l.owner))).sort(),
    [leads]
  );

  const filtered = useMemo(
    () =>
      optimisticLeads.filter(
        (l) =>
          (!ownerFilter || l.owner === ownerFilter) &&
          (!sourceFilter || l.source === sourceFilter)
      ),
    [optimisticLeads, ownerFilter, sourceFilter]
  );

  const conversionRate =
    stats.total > 0 ? Math.round((stats.wonCount / stats.total) * 100) : 0;

  function moveStage(lead: Lead, stage: Stage) {
    startTransition(async () => {
      applyStage({ id: lead.id, stage });
      try {
        const res = await fetch(`/api/leads/${lead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }
        toast.success(`${lead.fullName} → ${STAGE_META[stage].label}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to move lead");
        router.refresh();
      }
    });
  }

  async function createLead(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, owner: form.owner || currentUser }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Lead ${form.fullName} added to pipeline`);
      setCreateOpen(false);
      setForm({ ...EMPTY_LEAD });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create lead");
    } finally {
      setSaving(false);
    }
  }

  async function logActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${detail.id}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Activity logged");
      setActivityForm({ type: "CALL", summary: "", nextFollowUp: "" });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log activity");
    } finally {
      setSaving(false);
    }
  }

  async function archiveLead(lead: Lead) {
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${lead.fullName} archived from pipeline`);
      setDetail(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive");
    }
  }

  async function convertLead(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${detail.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(convertForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`🎉 Enrolled as cadet ${data.cadet.rollNumber}`);
      setConvertOpen(false);
      setDetail(null);
      setConvertForm({ pcmPercentage: "", englishScore: "" });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setSaving(false);
    }
  }

  const detailActivities = detail
    ? activities.filter((a) => a.leadId === detail.id)
    : [];

  const kpis = [
    { label: "Open Pipeline Value", value: inr(stats.totalPipeline), sub: `${stats.openCount} active leads`, accent: "border-l-navy-700" },
    { label: "Enrolled (Won)", value: inr(stats.wonValue), sub: `${stats.wonCount} conversions`, accent: "border-l-emerald-500" },
    { label: "Conversion Rate", value: `${conversionRate}%`, sub: `${stats.wonCount} of ${stats.total} leads`, accent: "border-l-gold-500" },
    { label: "Lost / Dropped", value: String(stats.lostCount), sub: "Disqualified prospects", accent: "border-l-rose-500" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-navy-900">Admissions CRM</h1>
          <p className="text-sm text-slate-500">
            Sales pipeline — enquiry to enrolment for the counselling team
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setCreateOpen(true)} className={btnGold}>
            + Add Lead
          </button>
        )}
      </div>

      <ReadOnlyBanner show={!canEdit} />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm ${k.accent}`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {k.label}
            </p>
            <p className="mt-1 text-2xl font-black text-navy-900">{k.value}</p>
            <p className="text-[11px] text-slate-500">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex rounded-lg bg-slate-100 p-0.5">
          {(["pipeline", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold capitalize transition ${
                view === v ? "bg-white text-navy-900 shadow-sm" : "text-slate-500"
              }`}
            >
              {v === "pipeline" ? "🗂 Pipeline" : "📋 Table"}
            </button>
          ))}
        </div>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className={`${inputCls} max-w-48`}
        >
          <option value="">All Counsellors</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className={`${inputCls} max-w-44`}
        >
          <option value="">All Sources</option>
          {Object.entries(SOURCE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        {(ownerFilter || sourceFilter) && (
          <button
            onClick={() => {
              setOwnerFilter("");
              setSourceFilter("");
            }}
            className="text-xs font-bold text-rose-600 hover:underline"
          >
            ✕ Clear
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400">{filtered.length} leads shown</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📈"
          title="No leads in the pipeline"
          description="Add your first admission enquiry to start tracking the sales funnel from enquiry to enrolment."
        />
      ) : view === "pipeline" ? (
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin">
          {STAGES.map((stage) => {
            const stageLeads = filtered.filter((l) => l.stage === stage);
            const stageValue = stageLeads.reduce((a, b) => a + b.estimatedFee, 0);
            return (
              <div key={stage} className="flex w-64 shrink-0 flex-col">
                <div className="mb-2 flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${STAGE_META[stage].dot}`} />
                    <span className="text-xs font-bold text-navy-900">
                      {STAGE_META[stage].label}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {stageLeads.length}
                  </span>
                </div>
                <p className="mb-2 px-1 text-[10px] font-semibold text-slate-400">
                  {inr(stageValue)} pipeline
                </p>
                <div className="flex-1 space-y-2">
                  {stageLeads.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => setDetail(lead)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-gold-500/60 hover:shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-bold text-navy-900">
                          {lead.fullName}
                        </p>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black ${
                            lead.score >= 75
                              ? "bg-emerald-100 text-emerald-700"
                              : lead.score >= 50
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {lead.score}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {STREAM_LABELS[lead.interestedStream]} · {lead.city || "—"}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gold-600">
                          {inr(lead.estimatedFee)}
                        </span>
                        <span className="truncate text-[10px] text-slate-400">
                          {lead.owner.split(" ")[0]}
                        </span>
                      </div>
                    </button>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-[10px] text-slate-300">
                      empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm scrollbar-thin">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-bold">Prospect</th>
                <th className="px-4 py-3 font-bold">Stage</th>
                <th className="px-4 py-3 font-bold">Stream</th>
                <th className="px-4 py-3 font-bold">Source</th>
                <th className="px-4 py-3 font-bold">Counsellor</th>
                <th className="px-4 py-3 text-center font-bold">Score</th>
                <th className="px-4 py-3 text-right font-bold">Est. Fee</th>
                <th className="px-4 py-3 font-bold">Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setDetail(lead)}
                  className="cursor-pointer transition hover:bg-slate-50/70"
                >
                  <td className="px-4 py-3">
                    <p className="font-bold text-navy-900">{lead.fullName}</p>
                    <p className="text-[11px] text-slate-400">{lead.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={STAGE_META[lead.stage as Stage].badge}>
                      {STAGE_META[lead.stage as Stage].label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {STREAM_LABELS[lead.interestedStream]}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {SOURCE_LABELS[lead.source]}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{lead.owner}</td>
                  <td className="px-4 py-3 text-center text-xs font-bold text-navy-900">
                    {lead.score}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-gold-600">
                    {inr(lead.estimatedFee)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {lead.nextFollowUp ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create lead modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Admission Lead"
        subtitle="Capture a new prospective cadet enquiry into the sales pipeline."
        wide
      >
        <form onSubmit={createLead} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Prospect Name">
            <input
              className={inputCls}
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputCls}
              required
              placeholder="+91 …"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputCls}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="City">
            <input
              className={inputCls}
              placeholder="e.g. Kanpur"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </Field>
          <Field label="Lead Source">
            <select
              className={inputCls}
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            >
              {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assigned Counsellor">
            <input
              className={inputCls}
              placeholder={currentUser}
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
            />
          </Field>
          <Field label="Interested Stream">
            <select
              className={inputCls}
              value={form.interestedStream}
              onChange={(e) => setForm({ ...form, interestedStream: e.target.value })}
            >
              {Object.entries(STREAM_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Interested Batch">
            <select
              className={inputCls}
              value={form.interestedBatch}
              onChange={(e) => setForm({ ...form, interestedBatch: e.target.value })}
            >
              <option value="ECHO">ECHO</option>
              <option value="VICTOR">VICTOR</option>
              <option value="ELITE">ELITE</option>
            </select>
          </Field>
          <Field label="Estimated Fee (₹)">
            <input
              type="number"
              className={inputCls}
              value={form.estimatedFee}
              onChange={(e) => setForm({ ...form, estimatedFee: e.target.value })}
            />
          </Field>
          <Field label="Lead Score (0–100)" hint="Higher = hotter prospect">
            <input
              type="number"
              min={0}
              max={100}
              className={inputCls}
              value={form.score}
              onChange={(e) => setForm({ ...form, score: e.target.value })}
            />
          </Field>
          <Field label="Next Follow-up Date">
            <input
              type="date"
              className={inputCls}
              value={form.nextFollowUp}
              onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea
                className={`${inputCls} min-h-16`}
                placeholder="Enquiry context, parent expectations, budget…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={() => setCreateOpen(false)} className={btnGhost}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Saving…" : "Add Lead"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Lead detail slide-over */}
      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.fullName ?? ""}
        subtitle={detail ? `${detail.phone} · ${detail.city || "—"}` : ""}
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge className={STAGE_META[detail.stage as Stage].badge}>
                {STAGE_META[detail.stage as Stage].label}
              </Badge>
              <Badge className="bg-slate-100 text-slate-600 ring-slate-400/20">
                {SOURCE_LABELS[detail.source]}
              </Badge>
              <Badge className="bg-gold-500/10 text-gold-600 ring-gold-500/30">
                {inr(detail.estimatedFee)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-slate-400">Stream</p>
                <p className="font-bold text-navy-900">
                  {STREAM_LABELS[detail.interestedStream]}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-slate-400">Batch</p>
                <p className="font-bold text-navy-900">{detail.interestedBatch}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-slate-400">Counsellor</p>
                <p className="font-bold text-navy-900">{detail.owner}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-slate-400">Lead Score</p>
                <p className="font-bold text-navy-900">{detail.score}/100</p>
              </div>
              {detail.email && (
                <div className="col-span-2 rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-slate-400">Email</p>
                  <p className="font-bold text-navy-900">{detail.email}</p>
                </div>
              )}
              {detail.nextFollowUp && (
                <div className="col-span-2 rounded-lg bg-amber-50 px-3 py-2">
                  <p className="text-amber-600">📅 Next follow-up</p>
                  <p className="font-bold text-amber-800">{detail.nextFollowUp}</p>
                </div>
              )}
            </div>

            {detail.notes && (
              <p className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs italic text-slate-600">
                “{detail.notes}”
              </p>
            )}

            {/* Stage mover */}
            {canEdit && detail.stage !== "ENROLLED" && (
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Move stage
                </p>
                <select
                  value={detail.stage}
                  onChange={(e) => {
                    const next = e.target.value as Stage;
                    moveStage(detail, next);
                    setDetail({ ...detail, stage: next });
                  }}
                  className={inputCls}
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_META[s].label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Convert / archive actions */}
            {canEdit && (
              <div className="flex gap-2">
                {detail.convertedCadetId ? (
                  <span className="flex-1 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-700">
                    ✓ Converted to cadet
                  </span>
                ) : (
                  <button
                    onClick={() => setConvertOpen(true)}
                    className={`${btnGold} flex-1`}
                  >
                    🎓 Convert to Cadet
                  </button>
                )}
                <button onClick={() => archiveLead(detail)} className={btnDanger}>
                  Archive
                </button>
              </div>
            )}

            {/* Quick add activity */}
            {canEdit && (
              <form
                onSubmit={logActivity}
                className="space-y-2 rounded-xl border border-slate-200 p-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Log activity
                </p>
                <div className="flex gap-2">
                  <select
                    value={activityForm.type}
                    onChange={(e) =>
                      setActivityForm({ ...activityForm, type: e.target.value })
                    }
                    className={`${inputCls} max-w-32`}
                  >
                    {Object.keys(ACTIVITY_ICON).map((t) => (
                      <option key={t} value={t}>
                        {ACTIVITY_ICON[t]} {t}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputCls}
                    placeholder="What happened?"
                    value={activityForm.summary}
                    onChange={(e) =>
                      setActivityForm({ ...activityForm, summary: e.target.value })
                    }
                  />
                </div>
                <button type="submit" disabled={saving} className={`${btnPrimary} w-full`}>
                  {saving ? "Saving…" : "Log Activity"}
                </button>
              </form>
            )}

            {/* Activity timeline */}
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Activity timeline
              </p>
              {detailActivities.length === 0 ? (
                <p className="text-xs text-slate-400">No activity logged yet.</p>
              ) : (
                <ol className="space-y-3 border-l-2 border-slate-100 pl-4">
                  {detailActivities.map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[21px] top-0.5 text-sm">
                        {ACTIVITY_ICON[a.type] ?? "•"}
                      </span>
                      <p className="text-xs font-semibold text-navy-900">{a.summary}</p>
                      <p className="text-[10px] text-slate-400">
                        {a.createdBy} ·{" "}
                        {new Date(a.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </Sheet>

      {/* Convert modal */}
      <Modal
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        title="Convert Lead to Cadet"
        subtitle="Enrol this prospect — a cadet record with an auto-generated roll number is created."
      >
        <form onSubmit={convertLead} className="space-y-4">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Converting <span className="font-bold text-navy-900">{detail?.fullName}</span> into{" "}
            {detail && STREAM_LABELS[detail.interestedStream]} · Batch{" "}
            {detail?.interestedBatch}. Enter their academic scores to complete enrolment.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="PCM %" hint="Officer streams need > 60%">
              <input
                type="number"
                step="0.1"
                required
                className={inputCls}
                value={convertForm.pcmPercentage}
                onChange={(e) =>
                  setConvertForm({ ...convertForm, pcmPercentage: e.target.value })
                }
              />
            </Field>
            <Field label="English Score">
              <input
                type="number"
                step="0.1"
                required
                className={inputCls}
                value={convertForm.englishScore}
                onChange={(e) =>
                  setConvertForm({ ...convertForm, englishScore: e.target.value })
                }
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConvertOpen(false)} className={btnGhost}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={btnGold}>
              {saving ? "Enrolling…" : "Confirm Enrolment"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
