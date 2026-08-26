import assert from "node:assert/strict";
import test from "node:test";
import { scheduleFSRS, type FSRSCard } from "./fsrs";

const now = new Date("2026-08-26T00:00:00.000Z");

function newCard(): FSRSCard {
  return { interval: 0, status: "new", learning_step: 0, lapses: 0, repetitions: 0 };
}

test("new card Good enters the first learning step", () => {
  const result = scheduleFSRS(newCard(), 3, { now });
  assert.equal(result.newState, "learning");
  assert.equal(result.newInterval, 0);
  assert.equal(result.newDueDate.getTime(), now.getTime() + 1 * 60_000);
});

test("review Again calculates lapse stability and enters relearning", () => {
  const result = scheduleFSRS({ ...newCard(), status: "review", stability: 20, difficulty: 6, interval: 20, last_review_at: "2026-08-01T00:00:00.000Z", repetitions: 4 }, 1, { now, fuzzFactorRange: 0 });
  assert.equal(result.newState, "relearning");
  assert.ok(result.newStability > 0);
  assert.ok(result.retrievabilityAtReview < 1);
});

test("repeated Easy reviews grow stability and interval", () => {
  let card: FSRSCard = { ...newCard(), status: "review", stability: 4, difficulty: 5, interval: 4, last_review_at: "2026-08-20T00:00:00.000Z", repetitions: 1 };
  const first = scheduleFSRS(card, 4, { now, fuzzFactorRange: 0 });
  card = { ...card, stability: first.newStability, difficulty: first.newDifficulty, interval: first.newInterval, last_review_at: first.newDueDate.toISOString(), repetitions: 2 };
  const second = scheduleFSRS(card, 4, { now: new Date(first.newDueDate.getTime() + 86_400_000), fuzzFactorRange: 0 });
  assert.ok(first.newInterval > 4);
  assert.ok(second.newInterval > first.newInterval);
});
