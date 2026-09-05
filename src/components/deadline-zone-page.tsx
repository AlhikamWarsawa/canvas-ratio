"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createDeadlineTaskId,
  loadDeadlineTasks,
  saveDeadlineTasks,
  type DeadlineTask,
} from "@/lib/deadline-zone";
import { getActiveProjects, getGlobalProjects } from "@/lib/settings";
import type { ProjectRecord } from "@/types/canvas";

type FormState = { name: string; deadline: string; projectId: string };
const emptyForm: FormState = { name: "", deadline: "", projectId: "" };

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Deadline terlewat";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((ms % 60_000) / 1_000);
  if (days > 0) return `${days} hari ${hours} jam ${minutes} mnt ${seconds} dtk`;
  return `${hours} jam ${minutes} mnt ${seconds} dtk`;
}

function expectedProgress(task: DeadlineTask, now: number): number {
  const created = new Date(task.createdAt).getTime();
  const deadline = new Date(task.deadline).getTime();
  if (!Number.isFinite(created) || deadline <= created) return 100;
  return Math.min(100, Math.max(0, ((now - created) / (deadline - created)) * 100));
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function TaskCard({ task, now, onEdit, onDelete, onProgress }: {
  task: DeadlineTask;
  now: number;
  onEdit: (task: DeadlineTask) => void;
  onDelete: (id: string) => void;
  onProgress: (id: string, value: number) => void;
}) {
  const deadline = new Date(task.deadline).getTime();
  const remaining = Math.max(0, deadline - now);
  const created = new Date(task.createdAt).getTime();
  const total = Math.max(1, deadline - created);
  const countdownPercent = deadline <= now ? 100 : Math.min(100, Math.max(0, ((now - created) / total) * 100));
  const expected = expectedProgress(task, now);
  const behind = task.progressPercent + 3 < expected;
  const expired = deadline <= now;

  return (
    <article className={`border-2 border-[#1A1A1A] bg-white p-5 shadow-[5px_5px_0_#1A1A1A] ${behind ? "border-l-[10px] border-l-[#EF4444]" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="mt-1 text-2xl font-black">{task.name}</h2>
          <p className="mt-1 text-sm font-bold text-[#555]">{task.projectName && <><span style={{ color: task.projectColor }}>{task.projectName}</span> · </>}{new Date(task.deadline).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => onEdit(task)} className="border-2 border-[#1A1A1A] bg-[#FFD91A] px-3 py-1.5 text-sm font-black shadow-[2px_2px_0_#1A1A1A]">Edit</button>
          <button type="button" onClick={() => onDelete(task.id)} className="border-2 border-[#1A1A1A] bg-[#FFD7BF] px-3 py-1.5 text-sm font-black shadow-[2px_2px_0_#1A1A1A]">Hapus</button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded border-2 border-[#6FB6FF] bg-[#EEF7FF] p-4">
          <div className="flex items-center justify-between gap-2"><span className="font-black">Countdown</span><span className="text-right text-sm font-black text-[#2F5FBF]">{formatRemaining(deadline - now)}</span></div>
          <div className="mt-3 h-5 overflow-hidden border-2 border-[#1A1A1A] bg-white"><div className="h-full bg-[#6FB6FF] transition-[width] duration-1000" style={{ width: `${countdownPercent}%` }} /></div>
          <div className="mt-2 text-xs font-black"><span>{expired ? "Waktu habis" : `${Math.round(countdownPercent)}% waktu berjalan`}</span></div>
        </div>
        <div className={`rounded border-2 p-4 ${behind ? "border-[#EF4444] bg-[#FFF1F1]" : "border-[#8BCF3F] bg-[#F3FBEA]"}`}>
          <div className="flex items-center justify-between"><span className="font-black">Progress manual</span><span className="text-xl font-black">{task.progressPercent}%</span></div>
          <div className="mt-3 h-5 overflow-hidden border-2 border-[#1A1A1A] bg-white"><div className={`h-full transition-[width] duration-300 ${behind ? "bg-[#EF4444]" : "bg-[#8BCF3F]"}`} style={{ width: `${task.progressPercent}%` }} /></div>
          <input aria-label={`Progress ${task.name}`} type="range" min="0" max="100" value={task.progressPercent} onChange={(event) => onProgress(task.id, Number(event.currentTarget.value))} className="mt-3 w-full accent-[#D946EF]" />
          <div className="flex justify-between text-xs font-black"><span>{behind ? `Tertinggal: ekspektasi ${Math.round(expected)}%` : null}</span><span>100%</span></div>
        </div>
      </div>
    </article>
  );
}

export function DeadlineZonePage() {
  const [tasks, setTasks] = useState<DeadlineTask[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  useEffect(() => {
    setTasks(loadDeadlineTasks());
    setProjects(getActiveProjects(getGlobalProjects()));
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...tasks]
      .filter((task) => !query || task.name.toLowerCase().includes(query))
      .filter((task) => !projectFilter || task.projectId === projectFilter)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [projectFilter, searchQuery, tasks]);

  function updateTasks(next: DeadlineTask[]) { setTasks(next); saveDeadlineTasks(next); }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const project = projects.find((candidate) => candidate.id === form.projectId);
    if (!form.name.trim() || !form.deadline) { setError("Isi nama tugas dan deadline."); return; }
    const deadline = new Date(form.deadline).toISOString();
    if (new Date(deadline).getTime() <= Date.now() && !editingId) { setError("Deadline harus berada di masa depan."); return; }
    const projectData = project ? { projectId: project.id, projectName: project.name, projectColor: project.color } : { projectId: "", projectName: "", projectColor: "#1A1A1A" };
    if (editingId) updateTasks(tasks.map((task) => task.id === editingId ? { ...task, name: form.name.trim(), deadline, ...projectData, updatedAt: new Date().toISOString() } : task));
    else { const createdAt = new Date().toISOString(); updateTasks([...tasks, { id: createDeadlineTaskId(), name: form.name.trim(), deadline, ...projectData, progressPercent: 0, createdAt, updatedAt: createdAt }]); }
    setForm(emptyForm); setEditingId(null);
  }

  function edit(task: DeadlineTask) { setEditingId(task.id); setForm({ name: task.name, deadline: toLocalInput(task.deadline), projectId: task.projectId }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function remove(id: string) { if (window.confirm("Hapus tugas ini?")) updateTasks(tasks.filter((task) => task.id !== id)); }
  function progress(id: string, value: number) { updateTasks(tasks.map((task) => task.id === id ? { ...task, progressPercent: value, updatedAt: new Date().toISOString() } : task)); }

  return (
    <main className="min-h-screen bg-[#F7F8F3] px-4 py-6 text-[#181818] sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-5 border-b-2 border-[#1A1A1A] pb-5">
          <div>
            <Link href="/" className="border-2 border-[#1A1A1A] bg-[#1A1A1A] px-3 py-2 text-sm font-black text-white shadow-[3px_3px_0_#FFD91A]">Home</Link>
            <h1 className="mt-5 text-4xl font-black sm:text-5xl">Deadline Zone<span className="text-[#D946EF]">.</span></h1>
          </div>
        </header>
        <form onSubmit={submit} className="mt-8 border-2 border-[#1A1A1A] bg-[#FFF9D9] p-5 shadow-[5px_5px_0_#1A1A1A]">
          <div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-black">{editingId ? "Edit tugas" : "Tambah tugas"}</h2>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="font-black underline">Batal edit</button>}</div>
          <div className="mt-4 grid gap-4 md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-end">
            <label><span className="text-sm font-black uppercase text-[#2F5FBF]">Nama tugas</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} placeholder="Contoh: Selesaikan proposal" className="mt-2 min-h-11 w-full border-2 border-[#1A1A1A] bg-white px-3 font-bold focus:outline-none focus:ring-4 focus:ring-[#D946EF]" /></label>
            <label><span className="text-sm font-black uppercase text-[#2F5FBF]">Deadline</span><input required type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.currentTarget.value })} className="mt-2 min-h-11 w-full border-2 border-[#1A1A1A] bg-white px-3 font-bold focus:outline-none focus:ring-4 focus:ring-[#D946EF]" /></label>
            <label><span className="text-sm font-black uppercase text-[#2F5FBF]">Project</span><select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.currentTarget.value })} className="mt-2 min-h-11 w-full border-2 border-[#1A1A1A] bg-white px-3 font-bold focus:outline-none focus:ring-4 focus:ring-[#D946EF]"><option value="">Tanpa project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <button className="min-h-11 border-2 border-[#1A1A1A] bg-[#D946EF] px-5 font-black text-white shadow-[3px_3px_0_#1A1A1A] hover:bg-[#B832C5]">{editingId ? "Simpan" : "+ Tambah"}</button>
          </div>
          {error && <p role="alert" className="mt-3 font-black text-[#DC2626]">{error}</p>}
        </form>
        <section className="mt-8 border-2 border-[#1A1A1A] bg-white p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label><span className="text-sm font-black uppercase text-[#2F5FBF]">Cari tugas</span><input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.currentTarget.value)} placeholder="Ketik nama tugas..." className="mt-2 min-h-11 w-full border-2 border-[#1A1A1A] bg-white px-3 font-bold focus:outline-none focus:ring-4 focus:ring-[#D946EF]" /></label>
            <label><span className="text-sm font-black uppercase text-[#2F5FBF]">Filter project</span><select value={projectFilter} onChange={(event) => setProjectFilter(event.currentTarget.value)} className="mt-2 min-h-11 w-full border-2 border-[#1A1A1A] bg-white px-3 font-bold focus:outline-none focus:ring-4 focus:ring-[#D946EF]"><option value="">Semua project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            {(searchQuery || projectFilter) && <button type="button" onClick={() => { setSearchQuery(""); setProjectFilter(""); }} className="min-h-11 border-2 border-[#1A1A1A] bg-[#FFD91A] px-4 font-black shadow-[3px_3px_0_#1A1A1A]">Reset filter</button>}
          </div>
        </section>
        <div className="mt-5 space-y-6">{filteredTasks.length ? filteredTasks.map((task) => <TaskCard key={task.id} task={task} now={now} onEdit={edit} onDelete={remove} onProgress={progress} />) : <div className="border-2 border-dashed border-[#1A1A1A] bg-white p-10 text-center"><p className="text-2xl font-black">{tasks.length ? "Task tidak ditemukan." : "Belum ada tugas."}</p><p className="mt-2 font-bold text-[#555]">{tasks.length ? "Coba ubah kata kunci atau project filter." : "Tambahkan deadline pertamamu di atas."}</p></div>}</div>
      </div>
    </main>
  );
}
