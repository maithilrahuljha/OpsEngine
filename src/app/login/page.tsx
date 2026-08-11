import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <main className="flex min-h-screen bg-navy-900">
      {/* Brand panel */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(212,175,55,0.18) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(42,74,115,0.6) 0, transparent 50%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-500 text-xl font-black text-navy-900">
            ⚓
          </div>
          <div>
            <p className="text-lg font-black tracking-tight text-white">
              PARAMOUNT <span className="text-gold-500">OpsEngine</span>
            </p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Merchant Navy Institute
            </p>
          </div>
        </div>
        <div className="relative">
          <h1 className="max-w-lg text-4xl font-black leading-tight text-white">
            Command the full cadet lifecycle —{" "}
            <span className="text-gold-500">intake to sponsorship</span>.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            Unified operations across Gwalior HQ, Patna and Dehradun spokes: hostels,
            medical pre-screening, CBT examinations and sponsorship viva pipelines.
          </p>
          <div className="mt-8 flex gap-6 text-xs text-slate-400">
            <div>
              <p className="text-2xl font-black text-gold-500">3</p>
              <p>Campuses</p>
            </div>
            <div>
              <p className="text-2xl font-black text-gold-500">4</p>
              <p>Sponsor Pipelines</p>
            </div>
            <div>
              <p className="text-2xl font-black text-gold-500">25+</p>
              <p>Active Cadets</p>
            </div>
          </div>
        </div>
        <p className="relative text-[11px] text-slate-500">
          © 2026 Paramount Merchant Navy Institute · Internal system, authorised personnel only
        </p>
      </div>

      {/* Login form panel */}
      <div className="flex w-full flex-col items-center justify-center bg-slate-50 px-6 py-12 lg:max-w-xl">
        <LoginForm />
      </div>
    </main>
  );
}
