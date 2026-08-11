"use client";

import { useOptimistic, useState, useTransition } from "react";
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
  Toggle,
  ReadOnlyBanner,
  BATCH_BADGE,
} from "@/components/ui";

type AuditRow = {
  id: number;
  cadetId: number;
  visionUnaided: boolean;
  ishiharaPassed: boolean;
  auditedBy: string;
  notes: string;
  createdAt: Date;
  cadetName: string;
  roll: string;
  batch: string;
  medicalStatus: string;
};

type RosterItem = { id: number; fullName: string; rollNumber: string };

export function MedicalClient({
  audits,
  roster,
  canEdit,
}: {
  audits: AuditRow[];
  roster: RosterItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cadetId: "",
    visionUnaided: true,
    ishiharaPassed: true,
    notes: "",
  });

  const [optimisticAudits, applyAudit] = useOptimistic(
    audits,
    (state, patch: { id: number; field: "visionUnaided" | "ishiharaPassed"; value: boolean }) =>
      state.map((a) => (a.id === patch.id ? { ...a, [patch.field]: patch.value } : a))
  );

  function toggleCheck(audit: AuditRow, field: "visionUnaided" | "ishiharaPassed", value: boolean) {
    startTransition(async () => {
      applyAudit({ id: audit.id, field, value });
      try {
        const res = await fetch("/api/medical", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auditId: audit.id, [field]: value }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (data.medicalStatus !== "PASSED") {
          toast.warning(
            `⚠ ${audit.cadetName} fails DG Shipping medical standards — sponsorship tests blocked.`,
            { duration: 5000 }
          );
        } else {
          toast.success(`${audit.cadetName} cleared — medically fit for sponsorship drives.`);
        }
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update audit");
        router.refresh();
      }
    });
  }

  async function createAudit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/medical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.medicalStatus !== "PASSED") {
        toast.warning("Audit recorded — cadet FAILS DG Shipping standards. Notification sent.");
      } else {
        toast.success("Audit recorded — cadet is medically fit.");
      }
      setOpen(false);
      setForm({ cadetId: "", visionUnaided: true, ishiharaPassed: true, notes: "" });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record audit");
    } finally {
      setSaving(false);
    }
  }

  const passCount = optimisticAudits.filter((a) => a.visionUnaided && a.ishiharaPassed).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-navy-900">
            Medical Pre-Screen Desk
          </h1>
          <p className="text-sm text-slate-500">
            DG Shipping parameters — 6/6 unaided vision &amp; Ishihara colour perception
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setOpen(true)} className={btnGold}>
            + New Screening
          </button>
        )}
      </div>

      <ReadOnlyBanner show={!canEdit} />

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-black text-navy-900">{optimisticAudits.length}</p>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Audits Logged
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-center shadow-sm">
          <p className="text-2xl font-black text-emerald-700">{passCount}</p>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600/70">
            Fully Cleared
          </p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-center shadow-sm">
          <p className="text-2xl font-black text-rose-700">
            {optimisticAudits.length - passCount}
          </p>
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600/70">
            Flagged / Blocked
          </p>
        </div>
      </div>

      {optimisticAudits.length === 0 ? (
        <EmptyState
          icon="🩺"
          title="No medical audits recorded"
          description="Run the first 6/6 vision and Ishihara screening to populate the medical desk."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm scrollbar-thin">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-bold">Cadet</th>
                <th className="px-4 py-3 font-bold">Batch</th>
                <th className="px-4 py-3 text-center font-bold">6/6 Vision (Unaided)</th>
                <th className="px-4 py-3 text-center font-bold">Ishihara Colour Test</th>
                <th className="px-4 py-3 text-center font-bold">Verdict</th>
                <th className="px-4 py-3 font-bold">Audited By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {optimisticAudits.map((a) => {
                const fit = a.visionUnaided && a.ishiharaPassed;
                return (
                  <tr key={a.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-bold text-navy-900">{a.cadetName}</p>
                      <p className="text-[11px] text-slate-400">{a.roll}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={BATCH_BADGE[a.batch]}>{a.batch}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Toggle
                          checked={a.visionUnaided}
                          disabled={!canEdit}
                          onChange={(v) => toggleCheck(a, "visionUnaided", v)}
                          label={`6/6 vision for ${a.cadetName}`}
                        />
                        <span
                          className={`text-[11px] font-bold ${a.visionUnaided ? "text-emerald-600" : "text-rose-600"}`}
                        >
                          {a.visionUnaided ? "PASS" : "FAIL"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Toggle
                          checked={a.ishiharaPassed}
                          disabled={!canEdit}
                          onChange={(v) => toggleCheck(a, "ishiharaPassed", v)}
                          label={`Ishihara for ${a.cadetName}`}
                        />
                        <span
                          className={`text-[11px] font-bold ${a.ishiharaPassed ? "text-emerald-600" : "text-rose-600"}`}
                        >
                          {a.ishiharaPassed ? "PASS" : "FAIL"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        className={
                          fit
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                            : "bg-rose-50 text-rose-700 ring-rose-600/20"
                        }
                      >
                        {fit ? "✓ Fit for Sponsorship" : "✕ Blocked"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {a.auditedBy}
                      <p className="text-[10px] text-slate-400">
                        {new Date(a.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New screening modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Medical Screening"
        subtitle="Record 6/6 unaided vision and Ishihara colour perception results."
      >
        <form onSubmit={createAudit} className="space-y-4">
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
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-navy-900">6/6 Vision — Unaided</p>
              <p className="text-[11px] text-slate-400">Snellen chart, both eyes without aid</p>
            </div>
            <Toggle
              checked={form.visionUnaided}
              onChange={(v) => setForm({ ...form, visionUnaided: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-navy-900">Ishihara Colour Perception</p>
              <p className="text-[11px] text-slate-400">38-plate colour blindness screen</p>
            </div>
            <Toggle
              checked={form.ishiharaPassed}
              onChange={(v) => setForm({ ...form, ishiharaPassed: v })}
            />
          </div>
          <Field label="Examiner Notes">
            <textarea
              className={`${inputCls} min-h-16`}
              placeholder="Optional observations…"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Recording…" : "Record Audit"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
