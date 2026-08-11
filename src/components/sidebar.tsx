"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/auth-shared";

const NAV = [
  { href: "/", icon: "📊", label: "Command Center", sub: "KPIs & fleet view" },
  { href: "/crm", icon: "📈", label: "Admissions CRM", sub: "Sales pipeline" },
  { href: "/cadets", icon: "🎖️", label: "Cadet Directory", sub: "Central roster" },
  { href: "/hostel", icon: "🏢", label: "Hostel & Discipline", sub: "Beds · roll-call" },
  { href: "/medical", icon: "🩺", label: "Medical Pre-Screen", sub: "6/6 · Ishihara" },
  { href: "/viva", icon: "⚓", label: "Sponsorship Vivas", sub: "Interview scoring" },
  { href: "/cbt", icon: "📝", label: "CBT Examination Hub", sub: "Mocks & AIR" },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {NAV.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
              active
                ? "bg-gold-500/15 ring-1 ring-inset ring-gold-500/40"
                : "hover:bg-navy-800"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="min-w-0">
              <span
                className={`block truncate text-sm font-semibold ${
                  active ? "text-gold-400" : "text-slate-200"
                }`}
              >
                {item.label}
              </span>
              <span className="block truncate text-[10px] text-slate-500">{item.sub}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 border-b border-navy-800 px-4 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500 text-lg font-black text-navy-900">
        ⚓
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black tracking-tight text-white">
          PARAMOUNT <span className="text-gold-500">OpsEngine</span>
        </p>
        <p className="truncate text-[10px] uppercase tracking-widest text-slate-500">
          Cadet Lifecycle Platform
        </p>
      </div>
    </div>
  );

  const roleFooter = (
    <div className="border-t border-navy-800 px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">Session role</p>
      <p className="text-xs font-bold text-gold-400">{role.replace(/_/g, " ")}</p>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 text-xl text-gold-500 shadow-xl lg:hidden"
        aria-label="Open navigation"
      >
        ☰
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-navy-900">
            {brand}
            {nav}
            {roleFooter}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy-900 lg:flex">
        {brand}
        {nav}
        {roleFooter}
      </aside>
    </>
  );
}
