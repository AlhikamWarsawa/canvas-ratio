import type { Flashcard, FlashcardStatus } from "@/types/flashcards";

export type FlashcardRating = 1 | 2 | 3 | 4;

export const LEARNING_STEPS_MINUTES = [1, 10] as const;

export function localDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isDue(card: Flashcard, now = new Date()): boolean {
  if (card.status === "learning" || card.status === "relearning") return card.due_at <= now.toISOString();
  return card.status === "new" || card.due_date <= localDate(now);
}

export function intervalPreview(card: Flashcard, rating: FlashcardRating): string {
  const quality = qualityForRating(rating);
  if (quality < 3) return "1d";
  const days = card.interval <= 1 ? 6 : Math.min(365, Math.max(1, Math.round(card.interval * nextEase(card.ease_factor, quality))));
  return `${days}d`;
}

export function scheduleFlashcard(card: Flashcard, rating: FlashcardRating, now = new Date()): Flashcard {
  const next = { ...card };
  const quality = qualityForRating(rating);
  next.ease_factor = nextEase(card.ease_factor, quality);
  if (quality < 3) {
    next.status = "relearning";
    next.learning_step = 0;
    next.repetitions = 0;
    next.interval = 1;
    next.lapses = card.lapses + 1;
    setDays(next, 1, now);
    return next;
  }
  next.status = "review";
  next.repetitions = card.repetitions + 1;
  next.interval = card.interval <= 1 ? 6 : Math.min(365, Math.max(1, Math.round(card.interval * next.ease_factor)));
  setDays(next, next.interval, now);
  return next;
}

function qualityForRating(rating: FlashcardRating): 1 | 3 | 4 | 5 {
  return rating === 1 ? 1 : rating === 2 ? 3 : rating === 3 ? 4 : 5;
}

function nextEase(current: number, quality: 1 | 3 | 4 | 5): number {
  const gap = 5 - quality;
  const delta = 0.1 - gap * (0.08 + gap * 0.02);
  return Math.max(1.3, current + delta);
}

export function getFlashcardQueue(cards: Flashcard[], settings: { newCardsPerDay: number; maxReviewsPerDay: number }, now = new Date()): Flashcard[] {
  const skippedOrLearning = shuffle(cards.filter((card) => (card.status === "learning" || card.status === "relearning") && isDue(card, now)));
  const wrongDue = shuffle(cards.filter((card) => card.status === "review" && card.lapses > 0 && isDue(card, now)));
  const unseen = shuffle(cards.filter((card) => card.status === "new")).slice(0, settings.newCardsPerDay);
  const correctDue = shuffle(cards.filter((card) => card.status === "review" && card.lapses === 0 && isDue(card, now)));
  const notYetDue = shuffle(cards.filter((card) => card.status === "review" && !isDue(card, now)));
  return [...skippedOrLearning, ...wrongDue, ...unseen, ...correctDue, ...notYetDue].slice(0, settings.maxReviewsPerDay);
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function isLeech(card: Flashcard): boolean {
  return card.lapses >= 8;
}

export function recallCountdown(card: Flashcard, now = new Date()): string {
  const due = new Date(card.due_at).getTime();
  const remaining = due - now.getTime();
  if (remaining <= 0) return "Ready now";
  const minutes = Math.ceil(remaining / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.ceil(hours / 24)}d`;
}

function setMinutes(card: Flashcard, minutes: number, now: Date) {
  const due = new Date(now.getTime() + minutes * 60_000);
  card.due_at = due.toISOString();
  card.due_date = localDate(due);
}

function setDays(card: Flashcard, days: number, now: Date) {
  const due = new Date(now);
  due.setDate(due.getDate() + days);
  card.due_date = localDate(due);
  card.due_at = due.toISOString();
}

export function createFlashcard(deckId: string, front: string, back: string, image_url = ""): Flashcard {
  const now = new Date();
  return { id: crypto.randomUUID(), deck_id: deckId, front, back, image_url, ease_factor: 2.5, interval: 0, repetitions: 0, due_date: localDate(now), due_at: now.toISOString(), status: "new", lapses: 0, learning_step: 0 };
}

export function statusLabel(status: FlashcardStatus): string {
  return status === "new" ? "New" : status === "learning" ? "Learning" : status === "review" ? "Review" : "Relearning";
}
