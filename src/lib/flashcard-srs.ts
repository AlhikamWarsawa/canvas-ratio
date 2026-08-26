import { DEFAULT_LEARNING_STEPS_MINUTES, DEFAULT_RELEARNING_STEPS_MINUTES, scheduleFSRS, type FSRSRating } from "./fsrs";
import type { Flashcard, FlashcardStatus } from "../types/flashcards";

export type FlashcardRating = 1 | 2 | 3 | 4;

export const LEARNING_STEPS_MINUTES = [1, 10] as const;

const ratingNames: Record<FlashcardRating, FSRSRating> = { 1: 1, 2: 2, 3: 3, 4: 4 };

export function localDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isDue(card: Flashcard, now = new Date()): boolean {
  if (card.status === "new") return true;
  return card.due_at <= now.toISOString();
}

export function intervalPreview(card: Flashcard, rating: FlashcardRating): string {
  const schedule = scheduleFSRS(card, ratingNames[rating], { fuzzFactorRange: 0 });
  return schedule.newState === "learning" || schedule.newState === "relearning" ? `${Math.max(1, Math.round((schedule.newDueDate.getTime() - Date.now()) / 60_000))}m` : `${schedule.newInterval}d`;
}

export function scheduleFlashcard(card: Flashcard, rating: FlashcardRating, now = new Date(), desiredRetention = 0.9): Flashcard {
  const schedule = scheduleFSRS(card, ratingNames[rating], { now, desiredRetention, learningStepsMinutes: DEFAULT_LEARNING_STEPS_MINUTES, relearningStepsMinutes: DEFAULT_RELEARNING_STEPS_MINUTES });
  const next = { ...card, stability: schedule.newStability, difficulty: schedule.newDifficulty, last_review_at: now.toISOString(), ease_factor: Math.max(1.3, 3.2 - schedule.newDifficulty * 0.2), interval: schedule.newInterval, due_date: localDate(schedule.newDueDate), due_at: schedule.newDueDate.toISOString(), status: schedule.newState, learning_step: schedule.newState === "review" ? 0 : card.learning_step + 1, lapses: rating === 1 ? card.lapses + 1 : card.lapses, repetitions: rating === 1 ? 0 : card.repetitions + 1 };
  return next;
}

export function getFlashcardQueue(cards: Flashcard[], settings: { newCardsPerDay: number; maxReviewsPerDay: number }, now = new Date()): Flashcard[] {
  const skippedOrLearning = shuffle(cards.filter((card) => (card.status === "learning" || card.status === "relearning") && isDue(card, now)));
  const wrongDue = shuffle(cards.filter((card) => card.status === "review" && card.lapses > 0 && isDue(card, now)));
  const unseen = shuffle(cards.filter((card) => card.status === "new")).slice(0, settings.newCardsPerDay);
  const correctDue = shuffle(cards.filter((card) => card.status === "review" && card.lapses === 0 && isDue(card, now)));
  return [...skippedOrLearning, ...wrongDue, ...unseen, ...correctDue].slice(0, settings.maxReviewsPerDay);
}

export function getLearningQueue(cards: Flashcard[], now = new Date()): Flashcard[] {
  return shuffle(cards.filter((card) => (card.status === "learning" || card.status === "relearning") && isDue(card, now)));
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

export function createFlashcard(deckId: string, front: string, back: string, image_url = ""): Flashcard {
  const now = new Date();
  return { id: crypto.randomUUID(), deck_id: deckId, front, back, image_url, ease_factor: 2.5, interval: 0, repetitions: 0, due_date: localDate(now), due_at: now.toISOString(), status: "new", lapses: 0, learning_step: 0, stability: 0, difficulty: 5 };
}

export function statusLabel(status: FlashcardStatus): string {
  return status === "new" ? "New" : status === "learning" ? "Learning" : status === "review" ? "Review" : "Relearning";
}
