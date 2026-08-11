"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROLE_LABELS, type Session } from "@/lib/auth-shared";

const CAMPUSES = ["Gwalior HQ", "Patna Spoke", "Dehradun Spoke"];

export function Header({ session }: { session: Session }) {
  const router = useRouter();
  const [campus, setCampus] = useState(session.campus || "Gwalior HQ");
  const [drawer, setDrawer] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setDrawer(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Signed out. Fair winds!");
    router.push("/login");
    router.refresh();
  }

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q") as string;
    if (q?.trim()) router.push(`/cadets?q=${encodeURIComponent(q.trim())}`);
  }

  const initials = session.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Campus selector */}
        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-semibold text-slate-400 sm:block">Campus</span>
          <select
            value={campus}
            onChange={(e) => {
              setCampus(e.target.value);
              toast.info(`Viewing ${e.target.value} operations`);
            }}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-900 focus:border-gold-500 focus:outline-none"
          >
            {CAMPUSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* System status */}
        <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 md:inline-flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          All Systems Operational
        </span>

        {/* Search */}
        <form onSubmit={onSearch} className="ml-auto hidden max-w-xs flex-1 sm:block">
          <input
            name="q"
            placeholder="Search cadets, roll numbers…"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs placeholder:text-slate-400 focus:border-gold-500 focus:bg-white focus:outline-none"
          />
        </form>

        {/* Profile drawer */}
        <div className="relative ml-auto sm:ml-0" ref={ref}>
          <button
            onClick={() => setDrawer((d) => !d)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 shadow-sm transition hover:border-gold-500/50"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 text-[11px] font-black text-gold-500">
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-bold text-navy-900">{session.name}</span>
              <span className="block text-[10px] text-slate-500">
                {ROLE_LABELS[session.role]}
              </span>
            </span>
          </button>
          {drawer && (
            <div className="absolute right-0 mt-2 w-64 animate-fade-up rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <p className="text-sm font-bold text-navy-900">{session.name}</p>
              <p className="text-xs text-slate-500">{session.email}</p>
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">
                  Access level
                </p>
                <p className="text-xs font-bold text-navy-900">{ROLE_LABELS[session.role]}</p>
              </div>
              <button
                onClick={logout}
                className="mt-3 w-full rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-500"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
