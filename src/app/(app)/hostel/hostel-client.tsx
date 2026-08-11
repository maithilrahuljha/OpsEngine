"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Cadet, RollCall } from "@/db/schema";
import {
  Badge,
  Modal,
  EmptyState,
  Field,
  inputCls,
  btnPrimary,
  btnGhost,
  btnGold,
  Toggle,
  ReadOnlyBanner,
  BATCH_BADGE,
} from "@/components/ui";

type Incident = {
  id: number;
  cadetId: number;
  incident: string;
  severity: "LOW" | "MEDIUM" | "CRITICAL";
  actionTaken: string;
  createdAt: Date;
  cadetName: string;
  roll: string;
};

const SEVERITY_BADGE: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600 ring-slate-400/20",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CRITICAL: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export function HostelClient({
  roster,
  todayCalls,
  incidents,
  today,
  canAttendance,
  canDiscipline,
  canHostel,
}: {
  roster: Cadet[];
  todayCalls: RollCall[];
  incidents: Incident[];
  today: string;
  canAttendance: boolean;
  canDiscipline: boolean;
  canHostel: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<"beds" | "rollcall" | "incidents">("beds");
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [incForm, setIncForm] = useState({
    cadetId: "",
    incident: "",
    severity: "LOW",
    actionTaken: "",
  });

  // present map: cadetId -> boolean (default present=true when not marked yet? treat unmarked separately)
  const baseAttendance = useMemo(() => {
    const map: Record<number, boolean | undefined> = {};
    todayCalls.forEach((r) => (map[r.cadetId] = r.present));
    return map;
  }, [todayCalls]);

  const [optimisticAttendance, applyAttendance] = useOptimistic(
    baseAttendance,
    (state, { cadetId, present }: { cadetId: number; present: boolean }) => ({
      ...state,
      [cadetId]: present,
    })
  );

  function toggleAttendance(cadetId: number, present: boolean) {
    startTransition(async () => {
      applyAttendance({ cadetId, present });
      try {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cadetId, date: today, present }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to mark roll-call");
        router.refresh();
      }
    });
  }

  async function logIncident(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/discipline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Incident logged & escalated to warden desk");
      setIncidentOpen(false);
      setIncForm({ cadetId: "", incident: "", severity: "LOW", actionTaken: "" });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log incident");
    } finally {
      setSaving(false);
    }
  }

  // Floor-wise grouping by room prefix (A-, B-, C- => floors)
  const floors = useMemo(() => {
    const groups: Record<string, Cadet[]> = { "A — Ground Deck": [], "B — First Deck": [], "C — Second Deck": [], Unassigned: [] };
    roster.forEach((c) => {
      if (!c.hostelRoom) groups["Unassigned"].push(c);
      else if (c.hostelRoom.startsWith("A")) groups["A — Ground Deck"].push(c);
      else if (c.hostelRoom.startsWith("B")) groups["B — First Deck"].push(c);
      else groups["C — Second Deck"].push(c);
    });
    return groups;
  }, [roster]);

  const presentCount = roster.filter((c) => optimisticAttendance[c.id] === true).length;
  const markedCount = roster.filter((c) => optimisticAttendance[c.id] !== undefined).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-navy-900">
            Hostel &amp; Discipline
          </h1>
          <p className="text-sm text-slate-500">
            Floor-wise bed allocation · nightly roll-call · incident register
          </p>
        </div>
        {canDiscipline && (
          <button onClick={() => setIncidentOpen(true)} className={btnGold}>
            + Log Incident
          </button>
        )}
      </div>

      <ReadOnlyBanner show={!canAttendance && !canDiscipline && !canHostel} />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {(
          [
            ["beds", "🛏 Bed Allocation"],
            ["rollcall", `🕘 Nightly Roll-Call (${presentCount}/${roster.length})`],
            ["incidents", `⚠ Incidents (${incidents.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
              tab === key ? "bg-navy-900 text-gold-400" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "beds" && (
        <div className="space-y-5">
          {Object.entries(floors).map(([floor, list]) => (
            <div key={floor} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black text-navy-900">{floor}</h2>
                <span className="text-xs text-slate-400">{list.length} cadets</span>
              </div>
              {list.length === 0 ? (
                <p className="text-xs text-slate-400">No cadets on this deck.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {list.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 transition hover:border-gold-500/60 hover:bg-white"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-black text-gold-600">
                          {c.hostelRoom ?? "—"}
                        </span>
                        <Badge className={BATCH_BADGE[c.batch]}>{c.batch}</Badge>
                      </div>
                      <p className="mt-1 truncate text-xs font-bold text-navy-900">{c.fullName}</p>
                      <p className="truncate text-[10px] text-slate-400">{c.rollNumber}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "rollcall" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-black text-navy-900">Nightly Roll-Call — {today}</h2>
              <p className="text-xs text-slate-500">
                {markedCount} marked · {presentCount} present ·{" "}
                {markedCount - presentCount} absent
              </p>
            </div>
            {!canAttendance && (
              <span className="text-[11px] font-bold text-amber-600">
                🔒 Only the Chief Warden can mark attendance
              </span>
            )}
          </div>
          <ul className="divide-y divide-slate-100">
            {roster.map((c) => {
              const state = optimisticAttendance[c.id];
              return (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-navy-900">{c.fullName}</p>
                    <p className="text-[11px] text-slate-400">
                      {c.rollNumber} · Room {c.hostelRoom ?? "—"}
                    </p>
                  </div>
                  <span
                    className={`w-20 text-right text-[11px] font-bold ${
                      state === undefined
                        ? "text-slate-300"
                        : state
                          ? "text-emerald-600"
                          : "text-rose-600"
                    }`}
                  >
                    {state === undefined ? "Unmarked" : state ? "Present" : "Absent"}
                  </span>
                  <Toggle
                    checked={state === true}
                    disabled={!canAttendance}
                    onChange={(v) => toggleAttendance(c.id, v)}
                    label={`Mark ${c.fullName}`}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tab === "incidents" &&
        (incidents.length === 0 ? (
          <EmptyState
            icon="🕊️"
            title="Clean disciplinary sheet"
            description="No incidents on record. Log one from the button above when required."
          />
        ) : (
          <div className="space-y-3">
            {incidents.map((i) => (
              <div
                key={i.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={SEVERITY_BADGE[i.severity]}>{i.severity}</Badge>
                  <span className="text-sm font-bold text-navy-900">{i.cadetName}</span>
                  <span className="text-[11px] text-slate-400">{i.roll}</span>
                  <span className="ml-auto text-[11px] text-slate-400">
                    {new Date(i.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{i.incident}</p>
                <p className="mt-1 text-xs text-slate-500">
                  <span className="font-bold text-navy-700">Action:</span> {i.actionTaken}
                </p>
              </div>
            ))}
          </div>
        ))}

      {/* Incident modal */}
      <Modal
        open={incidentOpen}
        onClose={() => setIncidentOpen(false)}
        title="Log Disciplinary Incident"
        subtitle="Entries are visible to COO and Director General immediately."
      >
        <form onSubmit={logIncident} className="space-y-4">
          <Field label="Cadet">
            <select
              className={inputCls}
              required
              value={incForm.cadetId}
              onChange={(e) => setIncForm({ ...incForm, cadetId: e.target.value })}
            >
              <option value="">Select cadet…</option>
              {roster.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rollNumber} — {c.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Incident Description">
            <textarea
              className={`${inputCls} min-h-20`}
              required
              placeholder="e.g. Absent from nightly muster without leave chit…"
              value={incForm.incident}
              onChange={(e) => setIncForm({ ...incForm, incident: e.target.value })}
            />
          </Field>
          <Field label="Severity">
            <select
              className={inputCls}
              value={incForm.severity}
              onChange={(e) => setIncForm({ ...incForm, severity: e.target.value })}
            >
              <option value="LOW">LOW — verbal counselling</option>
              <option value="MEDIUM">MEDIUM — warden review</option>
              <option value="CRITICAL">CRITICAL — COO escalation</option>
            </select>
          </Field>
          <Field label="Action Taken">
            <input
              className={inputCls}
              placeholder="e.g. Extra PT drill + written warning"
              value={incForm.actionTaken}
              onChange={(e) => setIncForm({ ...incForm, actionTaken: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setIncidentOpen(false)} className={btnGhost}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Logging…" : "Log Incident"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
