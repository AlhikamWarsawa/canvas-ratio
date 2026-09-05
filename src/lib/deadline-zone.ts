export const DEADLINE_ZONE_STORAGE_KEY = "canvas-ratio:deadline-zone:v1";

export type DeadlineTask = {
  id: string;
  name: string;
  deadline: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
};

export function loadDeadlineTasks(): DeadlineTask[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(DEADLINE_ZONE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDeadlineTask);
  } catch {
    return [];
  }
}

export function saveDeadlineTasks(tasks: DeadlineTask[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEADLINE_ZONE_STORAGE_KEY, JSON.stringify(tasks));
}

function isDeadlineTask(value: unknown): value is DeadlineTask {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<DeadlineTask>;
  return (
    typeof task.id === "string" &&
    typeof task.name === "string" &&
    typeof task.deadline === "string" &&
    typeof task.projectId === "string" &&
    typeof task.projectName === "string" &&
    typeof task.projectColor === "string" &&
    Number.isFinite(task.progressPercent)
  );
}

export function createDeadlineTaskId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
