"use client";

import { useEffect, useState } from "react";

function formatCountdown(difference: number): string {
  const totalSeconds = Math.max(0, Math.floor(difference / 1_000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}h ${String(hours).padStart(2, "0")}j ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}d`;
}

export function DeadlineCountdownButton() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(2026, 8, 20, 12, 0, 0).getTime();
    const update = () => setRemaining(target - Date.now());
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return <button type="button" disabled aria-label="Countdown menuju 20 September 2026 pukul 12 siang" className="group cursor-not-allowed border-2 border-[#1A1A1A] bg-[#FF8A1F] px-6 py-3 font-black shadow-[4px_4px_0_#1A1A1A] transition hover:bg-[#E8750C] disabled:opacity-100"><span className="group-hover:hidden">{remaining === null ? "Memuat countdown..." : formatCountdown(remaining)}</span><span className="hidden group-hover:inline">???</span></button>;
}
