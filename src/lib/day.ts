import { createEmptySlots, getTodayDateKey } from "@/lib/time";
import type { DayRecord } from "@/types/canvas";

export type DayStatus = "today" | "tomorrow" | "past" | "future";

export function createEmptyDayRecord(dateKey: string): DayRecord {
  const now = new Date().toISOString();

  return {
    date: dateKey,
    slots: createEmptySlots(),
    projects: [],
    sleepBlocks: [],
    randomEventBlocks: [],
    tasks: [],
    taskDump: [],
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function getDayStatus(dateKey: string): DayStatus {
  const todayDateKey = getTodayDateKey();
  const tomorrowDateKey = getTomorrowDateKey();

  if (dateKey < todayDateKey) {
    return "past";
  }

  if (dateKey === tomorrowDateKey) {
    return "tomorrow";
  }

  return dateKey > tomorrowDateKey ? "future" : "today";
}

export function isDayEditable(
  dateKey: string,
  day?: DayRecord | null,
): boolean {
  const status = getDayStatus(dateKey);

  return (status === "today" || status === "tomorrow") && day?.locked !== true;
}

function getTomorrowDateKey(): string {
  const [year, month, day] = getTodayDateKey().split("-").map(Number);
  const tomorrow = new Date(year, month - 1, day + 1);

  return [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, "0"),
    String(tomorrow.getDate()).padStart(2, "0"),
  ].join("-");
}
