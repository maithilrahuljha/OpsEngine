"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Badge,
  Modal,
  EmptyState,
  Field,
  inputCls,
  btnPrimary,
  btnGhost,
  btnGold,
  ReadOnlyBanner,
  BATCH_BADGE,
} from "@/components/ui";

type ScoreRow = {
  id: number;
  cadetId: number;
  examTitle: string;
  physics: number;
  chemistry: number;
  math: number;
  totalScore: number;
  allIndiaRank: number;
  createdAt: Date;
  cadetName: string;
  roll: string;
  batch: string;
};

type RosterItem = { id: number; fullName: string; rollNumber: string };

export function CbtClient({
  scores,
  topicAvg,
  roster,
  canEdit,
}: {
  scores: ScoreRow[];
  topicAvg: { physics: number; chemistry: number; math: number; total: number };
  roster: RosterItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cadetId: "",
    examTitle: "IMU-CET Mock Series IV — All India",
    physics: "",
    chemistry: "",
    math: "",
  });

  const liveTotal =
    form.physics && form.chemistry && form.math
      ? Math.round(((Number(form.physics) + Number(form.chemistry) + Number(form.math)) / 3) * 100) / 100
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/cbt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(
        `Result published — AIR ${data.score.allIndiaRank} with ${data.score.totalScore} aggregate`
      );
      setOpen(false);
      setForm({ ...form, cadetId: "", physics: "", chemistry: "", math: "" });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish result");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: ScoreRow) {
    try {
      const res = await fetch("/api/cbt", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Removed ${row.cadetName}'s result — ranks recomputed`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove result");
    }
  }

  const topics = [
    { label: "Physics", value: topicAvg.physics, color: "bg-sky-500" },
    { label: "Chemistry", value: topicAvg.chemistry, color: "bg-violet-500" },
    { label: "Mathematics", value: topicAvg.math, color: "bg-gold-500" },
  ];

  const examTitle = scores[0]?.examTitle ?? "No exam published";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-navy-900">
            CBT Examination Hub
          </h1>
          <p className="text-sm text-slate-500">
            {examTitle} · {scores.length} candidates ranked · avg {topicAvg.total}
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setOpen(true)} className={btnGold}>
            + Publish Result
          </button>
        )}
      </div>

      <ReadOnlyBanner show={!canEdit} />

      {/* Topic breakdown analytics */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black text-navy-900">Topic Breakdown — Cohort Averages</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {topics.map((t) => (
            <div key={t.label}>
              <div className="mb-1 flex justify-between text-xs font-bold">
                <span className="text-slate-500">{t.label}</span>
                <span className="text-navy-900">{t.value}/100</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${t.color}`}
                  style={{ width: `${Math.min(100, t.value)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {scores.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No CBT results published"
          description="Publish the first mock result to generate the All-India Rank board."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm scrollbar-thin">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-bold">AIR</th>
                <th className="px-4 py-3 font-bold">Cadet</th>
                <th className="px-4 py-3 font-bold">Batch</th>
                <th className="px-4 py-3 text-center font-bold">Physics</th>
                <th className="px-4 py-3 text-center font-bold">Chemistry</th>
                <th className="px-4 py-3 text-center font-bold">Math</th>
                <th className="px-4 py-3 text-center font-bold">Aggregate</th>
                {canEdit && <th className="px-4 py-3 text-right font-bold">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scores.map((s) => (
                <tr
                  key={s.id}
                  className={`transition hover:bg-slate-50/70 ${s.allIndiaRank <= 3 ? "bg-gold-500/5" : ""}`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex h-8 w-10 items-center justify-center rounded-lg text-xs font-black ${
                        s.allIndiaRank === 1
                          ? "bg-gold-500 text-navy-900"
                          : s.allIndiaRank <= 3
                            ? "bg-navy-900 text-gold-400"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      #{s.allIndiaRank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-navy-900">{s.cadetName}</p>
                    <p className="text-[11px] text-slate-400">{s.roll}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={BATCH_BADGE[s.batch]}>{s.batch}</Badge>
                  </td>
                  {[s.physics, s.chemistry, s.math].map((v, i) => (
                    <td key={i} className="px-4 py-3 text-center">
                      <span
                        className={`text-xs font-bold ${v >= 75 ? "text-emerald-600" : v >= 50 ? "text-navy-900" : "text-rose-600"}`}
                      >
                        {v}
                      </span>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center text-sm font-black text-navy-900">
                    {s.totalScore}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => remove(s)}
                        className="rounded-lg px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-600 hover:text-white"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Publish modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Publish CBT Mock Result"
        subtitle="All-India Ranks recompute automatically across the exam series."
      >
        <form onSubmit={submit} className="space-y-4">
          <Field label="Exam Series">
            <input
              className={inputCls}
              required
              value={form.examTitle}
              onChange={(e) => setForm({ ...form, examTitle: e.target.value })}
            />
          </Field>
          <Field label="Cadet">
            <select
              className={inputCls}
              required
              value={form.cadetId}
              onChange={(e) => setForm({ ...form, cadetId: e.target.value })}
            >
              <option value="">Select cadet…</option>
              {roster.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rollNumber} — {c.fullName}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            {(["physics", "chemistry", "math"] as const).map((k) => (
              <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  required
                  className={inputCls}
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              </Field>
            ))}
          </div>
          {liveTotal !== null && (
            <div className="flex items-center justify-between rounded-xl bg-navy-900 px-5 py-3">
              <span className="text-[11px] uppercase tracking-widest text-slate-400">
                Projected Aggregate
              </span>
              <span className="text-2xl font-black text-gold-400">{liveTotal}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Publishing…" : "Publish Result"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
