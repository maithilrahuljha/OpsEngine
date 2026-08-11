"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Cadet } from "@/db/schema";
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
  MEDICAL_LABELS,
  MEDICAL_BADGE,
  BATCH_BADGE,
} from "@/components/ui";

type Filters = {
  q: string;
  batch: string;
  stream: string;
  medical: string;
  sort: string;
  dir: string;
};

const OFFICER_STREAMS = ["DNS_OFFICER", "BSC_NAUTICAL", "BTECH_MARINE"];

const EMPTY_FORM = {
  rollNumber: "",
  fullName: "",
  email: "",
  phone: "",
  batch: "ECHO",
  stream: "DNS_OFFICER",
  hostelRoom: "",
  pcmPercentage: "",
  englishScore: "",
};

export function CadetsClient({
  cadets,
  total,
  page,
  pageSize,
  filters,
  canEdit,
}: {
  cadets: Cadet[];
  total: number;
  page: number;
  pageSize: number;
  filters: Filters;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Cadet | null>(null);
  const [deleting, setDeleting] = useState<Cadet | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function setParam(updates: Record<string, string>) {
    const sp = new URLSearchParams();
    const next = { ...filters, page: String(page), ...updates };
    Object.entries(next).forEach(([k, v]) => {
      if (v && !(k === "page" && v === "1")) sp.set(k, v);
    });
    startTransition(() => router.push(`/cadets?${sp.toString()}`));
  }

  function toggleSort(col: string) {
    if (filters.sort === col) {
      setParam({ sort: col, dir: filters.dir === "asc" ? "desc" : "asc", page: "1" });
    } else {
      setParam({ sort: col, dir: "asc", page: "1" });
    }
  }

  const pcmWarning =
    OFFICER_STREAMS.includes(form.stream) &&
    form.pcmPercentage !== "" &&
    Number(form.pcmPercentage) <= 60;

  async function createCadet(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/cadets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Cadet ${form.fullName} enrolled successfully`);
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to enroll cadet");
    } finally {
      setSaving(false);
    }
  }

  async function updateCadet(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cadets/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch: editing.batch,
          stream: editing.stream,
          hostelRoom: editing.hostelRoom || null,
          phone: editing.phone,
          pcmPercentage: Number(editing.pcmPercentage),
          englishScore: Number(editing.englishScore),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Cadet profile updated");
      setEditing(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCadet() {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cadets/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${deleting.fullName} archived from active roster`);
      setDeleting(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const header = "Roll No,Name,Email,Phone,Batch,Stream,Hostel Room,Medical Status,PCM %,English";
    const lines = cadets.map((c) =>
      [
        c.rollNumber,
        `"${c.fullName}"`,
        c.email,
        c.phone,
        c.batch,
        c.stream,
        c.hostelRoom ?? "-",
        c.medicalStatus,
        c.pcmPercentage,
        c.englishScore,
      ].join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paramount-cadets-page${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  const sortIcon = (col: string) =>
    filters.sort === col ? (filters.dir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-navy-900">Cadet Directory</h1>
          <p className="text-sm text-slate-500">
            {total} active cadets on roster · central intake & profile management
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className={btnGhost}>
            ⬇ Export CSV
          </button>
          {canEdit && (
            <button onClick={() => setCreateOpen(true)} className={btnGold}>
              + Enroll Cadet
            </button>
          )}
        </div>
      </div>

      <ReadOnlyBanner show={!canEdit} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <input
          defaultValue={filters.q}
          placeholder="Search name / roll / email…"
          className={`${inputCls} max-w-56`}
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam({ q: e.currentTarget.value, page: "1" });
          }}
        />
        <select
          value={filters.batch}
          onChange={(e) => setParam({ batch: e.target.value, page: "1" })}
          className={`${inputCls} max-w-40`}
        >
          <option value="">All Batches</option>
          <option value="ECHO">ECHO</option>
          <option value="VICTOR">VICTOR</option>
          <option value="ELITE">ELITE</option>
        </select>
        <select
          value={filters.stream}
          onChange={(e) => setParam({ stream: e.target.value, page: "1" })}
          className={`${inputCls} max-w-48`}
        >
          <option value="">All Streams</option>
          {Object.entries(STREAM_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={filters.medical}
          onChange={(e) => setParam({ medical: e.target.value, page: "1" })}
          className={`${inputCls} max-w-48`}
        >
          <option value="">All Medical Status</option>
          {Object.entries(MEDICAL_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        {(filters.q || filters.batch || filters.stream || filters.medical) && (
          <button
            onClick={() => startTransition(() => router.push("/cadets"))}
            className="text-xs font-bold text-rose-600 hover:underline"
          >
            ✕ Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {cadets.length === 0 ? (
        <EmptyState
          icon="🧭"
          title="No cadets match your filters"
          description="Adjust the batch, stream, or medical filters — or enroll a new cadet to get the roster moving."
        />
      ) : (
        <div
          className={`overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm scrollbar-thin ${isPending ? "opacity-60" : ""}`}
        >
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <th
                  className="cursor-pointer px-4 py-3 font-bold hover:text-navy-900"
                  onClick={() => toggleSort("rollNumber")}
                >
                  Roll No{sortIcon("rollNumber")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 font-bold hover:text-navy-900"
                  onClick={() => toggleSort("fullName")}
                >
                  Cadet{sortIcon("fullName")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 font-bold hover:text-navy-900"
                  onClick={() => toggleSort("batch")}
                >
                  Batch{sortIcon("batch")}
                </th>
                <th className="px-4 py-3 font-bold">Stream</th>
                <th className="px-4 py-3 font-bold">Room</th>
                <th
                  className="cursor-pointer px-4 py-3 font-bold hover:text-navy-900"
                  onClick={() => toggleSort("pcmPercentage")}
                >
                  PCM %{sortIcon("pcmPercentage")}
                </th>
                <th className="px-4 py-3 font-bold">Medical</th>
                {canEdit && <th className="px-4 py-3 text-right font-bold">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cadets.map((c) => (
                <tr key={c.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-navy-700">
                    {c.rollNumber}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-navy-900">{c.fullName}</p>
                    <p className="text-[11px] text-slate-400">{c.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={BATCH_BADGE[c.batch]}>{c.batch}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {STREAM_LABELS[c.stream]}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                    {c.hostelRoom ?? <span className="text-slate-300">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-navy-900">
                    {c.pcmPercentage}%
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={MEDICAL_BADGE[c.medicalStatus]}>
                      {MEDICAL_LABELS[c.medicalStatus]}
                    </Badge>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditing({ ...c })}
                        className="rounded-lg px-2 py-1 text-xs font-bold text-navy-700 hover:bg-navy-900 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleting(c)}
                        className="ml-1 rounded-lg px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-600 hover:text-white"
                      >
                        Archive
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Page {page} of {totalPages} · showing {cadets.length} of {total}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setParam({ page: String(page - 1) })}
            className={btnGhost}
          >
            ← Prev
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setParam({ page: String(page + 1) })}
            className={btnGhost}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Enroll New Cadet"
        subtitle="DG Shipping eligibility: Officer streams require PCM > 60%"
        wide
      >
        <form onSubmit={createCadet} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Roll Number">
            <input
              className={inputCls}
              required
              placeholder="PMI-2026-026"
              value={form.rollNumber}
              onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
            />
          </Field>
          <Field label="Full Name">
            <input
              className={inputCls}
              required
              placeholder="Cadet full name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputCls}
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
          <Field label="Batch">
            <select
              className={inputCls}
              value={form.batch}
              onChange={(e) => setForm({ ...form, batch: e.target.value })}
            >
              <option value="ECHO">ECHO</option>
              <option value="VICTOR">VICTOR</option>
              <option value="ELITE">ELITE</option>
            </select>
          </Field>
          <Field label="Stream">
            <select
              className={inputCls}
              value={form.stream}
              onChange={(e) => setForm({ ...form, stream: e.target.value })}
            >
              {Object.entries(STREAM_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="PCM Percentage">
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              className={`${inputCls} ${pcmWarning ? "border-rose-400 ring-2 ring-rose-300/40" : ""}`}
              required
              value={form.pcmPercentage}
              onChange={(e) => setForm({ ...form, pcmPercentage: e.target.value })}
            />
            {pcmWarning && (
              <span className="mt-1 block text-[11px] font-bold text-rose-600">
                ⚠ Officer streams require PCM &gt; 60% — cadet is ineligible.
              </span>
            )}
          </Field>
          <Field label="English Score (Class XII)">
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              className={inputCls}
              required
              value={form.englishScore}
              onChange={(e) => setForm({ ...form, englishScore: e.target.value })}
            />
          </Field>
          <Field label="Hostel Room (optional)">
            <input
              className={inputCls}
              placeholder="e.g. A-104"
              value={form.hostelRoom}
              onChange={(e) => setForm({ ...form, hostelRoom: e.target.value })}
            />
          </Field>
          <div className="flex items-end justify-end gap-2 sm:col-span-1">
            <button type="button" onClick={() => setCreateOpen(false)} className={btnGhost}>
              Cancel
            </button>
            <button type="submit" disabled={saving || pcmWarning} className={btnPrimary}>
              {saving ? "Enrolling…" : "Enroll Cadet"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit sheet */}
      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? editing.fullName : ""}
        subtitle={editing ? `${editing.rollNumber} · bed allocation & batch transfer` : ""}
      >
        {editing && (
          <form onSubmit={updateCadet} className="space-y-4">
            <Field label="Hostel Room / Bed">
              <input
                className={inputCls}
                placeholder="e.g. B-207"
                value={editing.hostelRoom ?? ""}
                onChange={(e) => setEditing({ ...editing, hostelRoom: e.target.value })}
              />
            </Field>
            <Field label="Batch Transfer">
              <select
                className={inputCls}
                value={editing.batch}
                onChange={(e) =>
                  setEditing({ ...editing, batch: e.target.value as Cadet["batch"] })
                }
              >
                <option value="ECHO">ECHO</option>
                <option value="VICTOR">VICTOR</option>
                <option value="ELITE">ELITE</option>
              </select>
            </Field>
            <Field label="Stream">
              <select
                className={inputCls}
                value={editing.stream}
                onChange={(e) =>
                  setEditing({ ...editing, stream: e.target.value as Cadet["stream"] })
                }
              >
                {Object.entries(STREAM_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Phone">
              <input
                className={inputCls}
                value={editing.phone}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="PCM %">
                <input
                  type="number"
                  step="0.1"
                  className={inputCls}
                  value={editing.pcmPercentage}
                  onChange={(e) =>
                    setEditing({ ...editing, pcmPercentage: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="English">
                <input
                  type="number"
                  step="0.1"
                  className={inputCls}
                  value={editing.englishScore}
                  onChange={(e) =>
                    setEditing({ ...editing, englishScore: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={saving} className={`${btnPrimary} flex-1`}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button type="button" onClick={() => setEditing(null)} className={btnGhost}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Sheet>

      {/* Delete confirmation */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Archive Cadet?"
        subtitle="Soft deletion — records are retained for audit but removed from the active roster."
      >
        {deleting && (
          <div>
            <p className="text-sm text-slate-600">
              You are about to archive{" "}
              <span className="font-bold text-navy-900">{deleting.fullName}</span> (
              {deleting.rollNumber}). Their viva, CBT and disciplinary history remains in the
              system.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleting(null)} className={btnGhost}>
                Keep Cadet
              </button>
              <button onClick={deleteCadet} disabled={saving} className={btnDanger}>
                {saving ? "Archiving…" : "Archive Cadet"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
