"use client";

import { useEffect, useState } from "react";

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const TARGET_DATE = {
  year: 2026,
  month: 8, // September; JavaScript months are zero-based.
  day: 6,
  hour: 12,
  minute: 0,
  second: 0,
};

function getRemainingTime(): CountdownParts {
  const target = new Date(
    TARGET_DATE.year,
    TARGET_DATE.month,
    TARGET_DATE.day,
    TARGET_DATE.hour,
    TARGET_DATE.minute,
    TARGET_DATE.second,
  ).getTime();
  const difference = Math.max(0, target - Date.now());

  return {
    days: Math.floor(difference / 86_400_000),
    hours: Math.floor((difference % 86_400_000) / 3_600_000),
    minutes: Math.floor((difference % 3_600_000) / 60_000),
    seconds: Math.floor((difference % 60_000) / 1_000),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function Countdown() {
  const [remaining, setRemaining] = useState<CountdownParts | null>(null);

  useEffect(() => {
    const update = () => setRemaining(getRemainingTime());
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      aria-label="Countdown menuju 6 September 2026 pukul 12 siang"
      className="group border-2 border-[#1A1A1A] bg-[#D946EF] px-6 py-3 font-black text-white shadow-[4px_4px_0_#1A1A1A]"
    >
      <span className="group-hover:hidden">
        {remaining ? (
          <>
            {remaining.days} Hari:{pad(remaining.hours)} Jam:{pad(remaining.minutes)} Menit:{pad(remaining.seconds)} Detik
          </>
        ) : (
          "Memuat countdown..."
        )}
      </span>
      <span className="hidden group-hover:inline">???</span>
    </div>
  );
}
