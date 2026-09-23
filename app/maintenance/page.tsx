"use client";

import { useEffect, useState } from "react";

const END_TIME = new Date("2026-09-24T14:00:00+02:00").getTime();

export default function MaintenancePage() {
  const [remaining, setRemaining] = useState(
    Math.max(0, END_TIME - Date.now())
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = END_TIME - Date.now();

      if (diff <= 0) {
        setRemaining(0);
        window.location.replace("/");
        return;
      }

      setRemaining(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const totalSeconds = Math.floor(remaining / 1000);

  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(
    Math.floor((totalSeconds % 3600) / 60)
  ).padStart(2, "0");

  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return (
    <main className="min-h-screen bg-[#090a0c] text-white flex items-center justify-center px-5">
      <div className="w-full max-w-2xl text-center">

        {/* GIF */}
        <div className="flex justify-center mb-8">
          <img
            src="/maintenance.gif"
            alt="Technická údržba"
            className="w-56 h-56 object-contain"
          />
        </div>

        {/* Status */}
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm text-orange-300 mb-6">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          Technická údržba
        </div>

        {/* Nadpis */}
        <h1 className="text-4xl md:text-5xl font-bold mb-5">
          Směnovník je momentálně nedostupný
        </h1>

        {/* Text */}
        <p className="text-zinc-400 text-lg">
          Právě probíhá plánovaná technická údržba.
          <br />
          Omlouváme se za dočasnou nedostupnost.
        </p>

        {/* Box */}
        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-7">

          <p className="text-zinc-500 text-sm mb-2">
            Předpokládané obnovení provozu
          </p>

          <p className="text-xl font-semibold">
            24. září 2026
          </p>

          <p className="text-3xl font-bold text-orange-400 mt-1">
            14:00
          </p>

          <div className="h-px bg-white/10 my-6" />

          <p className="text-xs uppercase tracking-[0.2em] text-zinc-600 mb-4">
            Do obnovení
          </p>

          <div className="flex justify-center gap-3">

            <TimeBox value={hours} label="hodin" />

            <span className="text-3xl text-zinc-600 mt-3">:</span>

            <TimeBox value={minutes} label="minut" />

            <span className="text-3xl text-zinc-600 mt-3">:</span>

            <TimeBox value={seconds} label="sekund" />

          </div>
        </div>

        <p className="text-zinc-600 text-sm mt-8">
          Děkujeme za pochopení.
        </p>

      </div>
    </main>
  );
}

function TimeBox({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div>
      <div className="w-20 h-16 flex items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-2xl font-bold">
        {value}
      </div>

      <p className="text-xs text-zinc-600 mt-2">
        {label}
      </p>
    </div>
  );
}