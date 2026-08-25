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
  if (card.status === "new" || card.status === "learning" || card.status === "relearning") {
    if (rating === 1) return "<1m";
    if (rating === 2) return "<6m";
    if (rating === 3) return "<10m";
    return "1d";
  }
  const base = Math.max(1, card.interval);
  const days = rating === 2 ? Math.max(1, Math.round(base * 1.2)) : rating === 3 ? Math.max(1, Math.round(base * card.ease_factor)) : rating === 4 ? Math.max(1, Math.round(base * card.ease_factor * 1.3)) : 1;
  return `${days}d`;
}

export function scheduleFlashcard(card: Flashcard, rating: FlashcardRating, now = new Date()): Flashcard {
  const next = { ...card };
  next.ease_factor = Math.max(1.3, card.ease_factor + (rating === 1 ? -0.2 : rating === 2 ? -0.15 : rating === 4 ? 0.15 : 0));
  if (rating === 1) {
    next.status = card.status === "new" ? "learning" : "relearning";
    next.learning_step = 0;
    next.repetitions = 0;
    next.interval = 0;
    next.lapses = card.lapses + 1;
    setMinutes(next, LEARNING_STEPS_MINUTES[0], now);
    return next;
  }
  if (card.status === "new" || card.status === "learning" || card.status === "relearning") {
    if (rating === 2) {
      next.status = card.status === "new" ? "learning" : card.status;
      next.learning_step = Math.min(card.learning_step + 1, LEARNING_STEPS_MINUTES.length - 1);
      setMinutes(next, 6, now);
      return next;
    }
    if (rating === 3) {
      next.status = card.status === "new" ? "learning" : card.status;
      next.learning_step = Math.min(card.learning_step + 1, LEARNING_STEPS_MINUTES.length - 1);
      setMinutes(next, 10, now);
      return next;
    }
    if (rating === 4) {
      next.status = "review";
      next.interval = 1;
      next.repetitions = Math.max(1, card.repetitions + 1);
      setDays(next, 1, now);
      return next;
    }
    next.status = "review";
    next.interval = 1;
    next.repetitions = Math.max(1, card.repetitions + 1);
    setDays(next, 1, now);
    return next;
  }
  const base = Math.max(1, card.interval);
  next.status = "review";
  next.repetitions = card.repetitions + 1;
  next.interval = rating === 2 ? Math.max(1, Math.round(base * 1.2)) : rating === 3 ? Math.max(1, Math.round(base * card.ease_factor)) : Math.max(1, Math.round(base * card.ease_factor * 1.3));
  setDays(next, next.interval, now);
  return next;
}

export function getFlashcardQueue(cards: Flashcard[], settings: { newCardsPerDay: number; maxReviewsPerDay: number }, now = new Date()): Flashcard[] {
  const learning = shuffle(cards.filter((card) => (card.status === "learning" || card.status === "relearning") && isDue(card, now)));
  const reviews = shuffle(cards.filter((card) => card.status === "review" && isDue(card, now)));
  const fresh = shuffle(cards.filter((card) => card.status === "new")).slice(0, settings.newCardsPerDay);
  return [...learning, ...reviews, ...fresh].slice(0, settings.maxReviewsPerDay);
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
