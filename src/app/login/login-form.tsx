"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, inputCls, btnPrimary } from "@/components/ui";

const DEMO_ACCOUNTS = [
  { email: "dg@paramount.in", label: "Director General", desc: "Read-only KPIs" },
  { email: "coo@paramount.in", label: "COO / Campus Mgr", desc: "Hostels · Cadets · Medical" },
  { email: "academics@paramount.in", label: "Academic Lead", desc: "CBT · Vivas · Batches" },
  { email: "warden@paramount.in", label: "Chief Warden", desc: "Attendance · Discipline" },
  { email: "sales@paramount.in", label: "Sales Executive", desc: "Admissions CRM pipeline" },
];

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("coo@paramount.in");
  const [password, setPassword] = useState("paramount123");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      toast.success(`Welcome aboard, ${data.user.name}`);
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 lg:hidden">
        <p className="text-xl font-black text-navy-900">
          ⚓ PARAMOUNT <span className="text-gold-600">OpsEngine</span>
        </p>
      </div>
      <h2 className="text-2xl font-black text-navy-900">Bridge Access</h2>
      <p className="mt-1 text-sm text-slate-500">
        Sign in with your operational credentials.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email">
          <input
            type="email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>
        <Field label="Password" hint="Demo password: paramount123">
          <input
            type="password"
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </Field>
        <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
          {loading ? "Authenticating…" : "Sign in to OpsEngine"}
        </button>
      </form>

      <div className="mt-8">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Demo role accounts
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setEmail(a.email);
                setPassword("paramount123");
              }}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                email === a.email
                  ? "border-gold-500 bg-gold-500/10 ring-1 ring-gold-500"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="text-xs font-bold text-navy-900">{a.label}</p>
              <p className="text-[10px] text-slate-500">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
