import assert from "node:assert/strict";
import test from "node:test";
import { getFlashcardQueue, getLearningQueue, isDue } from "./flashcard-srs";
import type { Flashcard } from "../types/flashcards";

const now = new Date("2026-08-26T12:00:00.000Z");
const settings = { newCardsPerDay: 20, maxReviewsPerDay: 100 };

function card(overrides: Partial<Flashcard>): Flashcard {
  return { id: crypto.randomUUID(), deck_id: "deck", front: "q", back: "a", ease_factor: 2.5, interval: 4, repetitions: 1, due_date: "2026-08-26", due_at: now.toISOString(), status: "review", lapses: 0, learning_step: 0, stability: 4, difficulty: 5, ...overrides };
}

test("review card due five days from now is not queued today", () => {
  const future = new Date(now.getTime() + 5 * 86_400_000);
  const result = getFlashcardQueue([card({ due_date: "2026-08-31", due_at: future.toISOString() })], settings, now);
  assert.equal(result.length, 0);
});

test("review card due yesterday is queued today", () => {
  const yesterday = new Date(now.getTime() - 86_400_000);
  const result = getFlashcardQueue([card({ due_date: "2026-08-25", due_at: yesterday.toISOString() })], settings, now);
  assert.equal(result.length, 1);
});

test("review cards are never captured by the learning polling queue", () => {
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const result = getLearningQueue([card({ due_date: "2026-08-27", due_at: tomorrow.toISOString() })], now);
  assert.equal(result.length, 0);
});

test("a card rescheduled several days ahead is not due in the same session", () => {
  const tomorrow = new Date(now.getTime() + 3 * 86_400_000);
  const updated = card({ due_date: "2026-08-29", due_at: tomorrow.toISOString() });
  assert.equal(isDue(updated, now), false);
  assert.equal(getFlashcardQueue([updated], settings, now).length, 0);
});

test("due timestamp boundary uses the exact UTC instant", () => {
  const justBeforeDue = new Date("2026-08-26T23:58:00.000Z");
  const justAfterMidnight = new Date("2026-08-27T00:01:00.000Z");
  const boundary = card({ due_date: "2026-08-27", due_at: "2026-08-26T23:59:00.000Z" });
  assert.equal(isDue(boundary, justBeforeDue), false);
  assert.equal(isDue(boundary, justAfterMidnight), true);
});
