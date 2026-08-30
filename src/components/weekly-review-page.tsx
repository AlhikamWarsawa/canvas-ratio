"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadDayRecord } from "@/lib/storage";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const COLORS = ["#D62828", "#2F5FBF", "#8BCF3F", "#F59E0B", "#9333EA", "#0891B2", "#DB2777"];
const KEY = "canvas-ratio:weekly-review:v1";
const EMPTY_STORIES = { monday: "", tuesday: "", wednesday: "", thursday: "", friday: "", saturday: "", sunday: "" };

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function mondayOf(date: Date) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function weekNumber(date: Date) {
  const thursday = new Date(date);
  thursday.setDate(thursday.getDate() + 3 - ((thursday.getDay() + 6) % 7));
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  return 1 + Math.round(((thursday.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}
function weekValueToDate(value: string) { const [year, week] = value.split("-W").map(Number); const date = new Date(year, 0, 4); return mondayOf(new Date(date.getTime() + (week - 1) * 7 * 86400000)); }

export function WeeklyReviewPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [stories, setStories] = useState<Record<(typeof DAYS)[number], string>>(EMPTY_STORIES);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [rangeStart, setRangeStart] = useState(() => dateKey(mondayOf(new Date())));
  const [rangeEnd, setRangeEnd] = useState(() => dateKey(mondayOf(new Date())));
  const weekStart = useMemo(() => { const date = mondayOf(new Date()); date.setDate(date.getDate() + weekOffset * 7); return date; }, [weekOffset]);
  const weekKey = dateKey(weekStart);
  const days = useMemo(() => DAYS.map((key, index) => { const date = new Date(weekStart); date.setDate(date.getDate() + index); const record = loadDayRecord(dateKey(date)); const projects = Array.from(new Set((record?.tasks ?? []).map((task) => task.projectName).filter(Boolean).concat((record?.projects ?? []).filter((project) => record?.slots.some((slot) => slot.color === project.color)).map((project) => project.name)))); return { key, date, projects }; }), [ready, weekKey, weekStart]);

  useEffect(() => { const saved = localStorage.getItem(`${KEY}:${weekKey}`); setStories(saved ? { ...EMPTY_STORIES, ...JSON.parse(saved) } : EMPTY_STORIES); setReady(true); setNotice(""); }, [weekKey]);
  useEffect(() => { if (ready) localStorage.setItem(`${KEY}:${weekKey}`, JSON.stringify(stories)); }, [ready, stories, weekKey]);

  function saveDay(key: (typeof DAYS)[number]) { localStorage.setItem(`${KEY}:${weekKey}`, JSON.stringify(stories)); setNotice(`${key} saved.`); }
  async function copyReview() {
    const chooseWeek = (label: string, value: string) => new Promise<string | null>(resolve => { const input = document.createElement("input"); input.type = "week"; input.value = value; input.title = label; input.style.position = "fixed"; input.style.left = "50%"; input.style.top = "50%"; input.style.opacity = "0.01"; input.style.zIndex = "9999"; document.body.appendChild(input); input.onchange = () => { const result = input.value; input.remove(); resolve(result || null); }; input.focus(); try { input.showPicker?.(); } catch { input.click(); } });
    const startInput = await chooseWeek("Start week", "");
    if (!startInput) return;
    const endInput = await chooseWeek("End week", "");
    if (!endInput) return;
    setRangeStart(startInput); setRangeEnd(endInput);
    const start = weekValueToDate(startInput);
    const end = weekValueToDate(endInput);
    if (start > end) { setNotice("Range start must be before range end."); return; }
    const weeks: Record<string, unknown> = {};
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 7)) {
      const key = dateKey(cursor); const saved = localStorage.getItem(`${KEY}:${key}`);
      weeks[key] = saved ? JSON.parse(saved) : EMPTY_STORIES;
    }
    await navigator.clipboard.writeText(`${JSON.stringify(weeks, null, 2)}\n\nSummarize this JSON into exactly 1 professional LinkedIn/CV bullet point. Make it achievement-oriented, concise, and start with an action verb.`); setNotice("Review range copied.");
  }
  async function copyRange() {
    const start = mondayOf(new Date(`${rangeStart}T00:00:00`));
    const end = mondayOf(new Date(`${rangeEnd}T00:00:00`));
    if (start > end) { setNotice("Range start must be before range end."); return; }
    const weeks: Record<string, unknown> = {};
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 7)) {
      const key = dateKey(cursor); const saved = localStorage.getItem(`${KEY}:${key}`);
      weeks[key] = saved ? JSON.parse(saved) : EMPTY_STORIES;
    }
    await navigator.clipboard.writeText(JSON.stringify(weeks, null, 2)); setNotice("Review range copied.");
  }

  return <main className="min-h-screen bg-[#F7F8F3] px-4 py-6 text-[#181818] sm:px-8"><div className="mx-auto max-w-5xl"><header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#1A1A1A] pb-5"><div><Link href="/" className="border-2 border-[#1A1A1A] bg-[#1A1A1A] px-3 py-2 text-sm font-black text-white">Home</Link><h1 className="mt-5 text-4xl font-black">Weekly Review</h1><p className="mt-2 font-black">Week {weekNumber(weekStart)} · {formatDate(weekStart)}</p></div><div className="flex items-center gap-2"><button onClick={() => setWeekOffset((value) => value - 1)} className="border-2 border-[#1A1A1A] bg-white px-4 py-2 text-xl font-black" aria-label="Previous week">←</button><button onClick={() => setWeekOffset((value) => value + 1)} className="border-2 border-[#1A1A1A] bg-white px-4 py-2 text-xl font-black" aria-label="Next week">→</button><button onClick={copyReview} className="border-2 border-[#1A1A1A] bg-[#1A1A1A] px-5 py-3 font-black text-white shadow-[4px_4px_0_#FFD91A]">Copy Review</button></div></header>{notice && <p className="mt-4 text-sm font-black">{notice}</p>}<div className="mt-8 grid gap-5">{days.map(({ key, date, projects }, index) => <section key={key} className="border-2 bg-white p-5 shadow-[4px_4px_0_#1A1A1A]" style={{ borderColor: COLORS[index] }}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">{LABELS[index]} · {formatDate(date)}</h2>{dateKey(date) === dateKey(new Date()) && <span className="border-2 border-[#1A1A1A] bg-[#FFD91A] px-2 py-1 text-xs font-black">TODAY</span>}</div><p className="mt-3 text-sm font-bold text-[#555]">Projects: {projects.length ? projects.join(", ") : "None"}</p><div className="mt-3 flex gap-3"><textarea value={stories[key]} onChange={(event) => setStories((current) => ({ ...current, [key]: event.target.value }))} rows={5} placeholder="Write your story for this day..." className="w-full resize-y border-2 border-[#1A1A1A] p-3 font-bold" /><button onClick={() => saveDay(key)} className="h-fit border-2 border-[#1A1A1A] bg-[#FFD91A] px-4 py-2 font-black">Save</button></div></section>)}</div></div></main>;
}
