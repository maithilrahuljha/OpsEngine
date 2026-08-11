"use client";

import { useMemo, useState } from "react";
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
} from "@/components/ui";

const COMPANIES = ["Anglo-Eastern", "Synergy", "Fleet Management", "GEIMS"];

const COMPANY_STYLE: Record<string, string> = {
  "Anglo-Eastern": "bg-sky-50 text-sky-700 ring-sky-600/20",
  Synergy: "bg-violet-50 text-violet-700 ring-violet-600/20",
  "Fleet Management": "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  GEIMS: "bg-gold-500/10 text-gold-600 ring-gold-500/30",
};

type Viva = {
  id: number;
  cadetId: number;
  company: string;
  technicalScore: number;
  fluencyScore: number;
  confidenceScore: number;
  evaluatorName: string;
  remarks: string;
  createdAt: Date;
  cadetName: string;
  roll: string;
  medicalStatus: string;
};

type RosterItem = {
  id: number;
  fullName: string;
  rollNumber: string;
  medicalStatus: string;
};

function suitability(v: { technicalScore: number; fluencyScore: number; confidenceScore: number }) {
  return Math.round(((v.technicalScore + v.fluencyScore + v.confidenceScore) / 3) * 10) / 10;
}

function verdict(score: number) {
  if (score >= 8) return { label: "Strong Hire", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" };
  if (score >= 6.5) return { label: "Recommend", cls: "bg-sky-50 text-sky-700 ring-sky-600/20" };
  if (score >= 5) return { label: "Borderline", cls: "bg-amber-50 text-amber-700 ring-amber-600/20" };
  return { label: "Re-attempt", cls: "bg-rose-50 text-rose-700 ring-rose-600/20" };
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[10px] font-bold">
        <span className="text-slate-500">{label}</span>
        <span className="text-navy-900">{value}/10</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  );
}

export function VivaClient({
  vivas,
  roster,
  canEdit,
}: {
  vivas: Viva[];
  roster: RosterItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyFilter, setCompanyFilter] = useState("");
  const [form, setForm] = useState({
    cadetId: "",
    company: "Anglo-Eastern",
    technicalScore: 6,
    fluencyScore: 6,
    confidenceScore: 6,
    remarks: "",
  });

  const filtered = useMemo(
    () => (companyFilter ? vivas.filter((v) => v.company === companyFilter) : vivas),
    [vivas, companyFilter]
  );

  const liveScore = suitability(form);
  const selectedCadet = roster.find((c) => String(c.id) === form.cadetId);
  const medicallyBlocked =
    selectedCadet &&
    (selectedCadet.medicalStatus === "FAILED_VISION" ||
      selectedCadet.medicalStatus === "FAILED_COLOR_BLINDNESS");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/viva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Viva scored — suitability ${liveScore}/10 for ${form.company}`);
      setOpen(false);
      setForm({
        cadetId: "",
        company: "Anglo-Eastern",
        technicalScore: 6,
        fluencyScore: 6,
        confidenceScore: 6,
        remarks: "",
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record viva");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-navy-900">
            Sponsorship Viva Tracker
          </h1>
          <p className="text-sm text-slate-500">
            Mock interview scoring for Anglo-Eastern · Synergy · Fleet Management · GEIMS
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setOpen(true)} className={btnGold}>
            + Score a Viva
          </button>
        )}
      </div>

      <ReadOnlyBanner show={!canEdit} />

      {/* Company filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCompanyFilter("")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
            !companyFilter ? "bg-navy-900 text-gold-400" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          All Pipelines ({vivas.length})
        </button>
        {COMPANIES.map((c) => (
          <button
            key={c}
            onClick={() => setCompanyFilter(companyFilter === c ? "" : c)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              companyFilter === c
                ? "bg-navy-900 text-gold-400"
                : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {c} ({vivas.filter((v) => v.company === c).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="⚓"
          title="No viva evaluations here"
          description="No interviews scored for this pipeline yet. Run a mock viva and record the panel's scores."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((v) => {
            const score = suitability(v);
            const vd = verdict(score);
            return (
              <div
                key={v.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-gold-500/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-navy-900">{v.cadetName}</p>
                    <p className="text-[11px] text-slate-400">{v.roll}</p>
                  </div>
                  <Badge className={COMPANY_STYLE[v.company] ?? "bg-slate-100 text-slate-600 ring-slate-400/20"}>
                    {v.company}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full bg-navy-900">
                    <span className="text-base font-black text-gold-400">{score}</span>
                    <span className="text-[8px] uppercase text-slate-400">/10</span>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <ScoreBar label="Technical" value={v.technicalScore} color="bg-navy-700" />
                    <ScoreBar label="Fluency" value={v.fluencyScore} color="bg-sky-500" />
                    <ScoreBar label="Confidence" value={v.confidenceScore} color="bg-gold-500" />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <Badge className={vd.cls}>{vd.label}</Badge>
                  <span className="text-[10px] text-slate-400">
                    {v.evaluatorName} · {new Date(v.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
                {v.remarks && (
                  <p className="mt-2 line-clamp-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] italic text-slate-500">
                    “{v.remarks}”
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Scoring modal with live sliders */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Score Sponsorship Viva"
        subtitle="Live sliders auto-calculate the overall suitability score."
        wide
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    {c.medicalStatus.startsWith("FAILED") ? " (⚠ medical block)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Recruitment Pipeline">
              <select
                className={inputCls}
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              >
                {COMPANIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          {medicallyBlocked && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700">
              ⚠ This cadet currently fails DG Shipping medical standards. Viva may proceed but
              sponsorship placement is blocked until medical clearance.
            </div>
          )}

          {(
            [
              ["technicalScore", "Technical Knowledge", "Seamanship, navigation, engineering basics"],
              ["fluencyScore", "English Fluency", "Clarity, vocabulary, comprehension"],
              ["confidenceScore", "Bearing & Confidence", "Posture, composure, officer-like qualities"],
            ] as const
          ).map(([key, label, desc]) => (
            <div key={key} className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-navy-900">{label}</p>
                  <p className="text-[11px] text-slate-400">{desc}</p>
                </div>
                <span className="text-xl font-black text-gold-600">{form[key]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                className="gold-range mt-2 w-full"
              />
            </div>
          ))}

          <div className="flex items-center justify-between rounded-xl bg-navy-900 px-5 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-400">
                Overall Suitability
              </p>
              <p className="text-xs text-slate-400">{verdict(liveScore).label}</p>
            </div>
            <p className="text-3xl font-black text-gold-400">
              {liveScore}
              <span className="text-sm text-slate-500">/10</span>
            </p>
          </div>

          <Field label="Panel Remarks">
            <textarea
              className={`${inputCls} min-h-16`}
              placeholder="e.g. Strong COLREGS fundamentals, needs work on situational answers…"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </Field>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Recording…" : "Record Viva Score"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
