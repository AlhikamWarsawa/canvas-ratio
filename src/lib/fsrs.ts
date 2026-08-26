export type FSRSRating = 1 | 2 | 3 | 4;
export type FSRSState = "learning" | "review" | "relearning";

export type FSRSCard = {
  stability?: number;
  difficulty?: number;
  last_review_at?: string;
  interval: number;
  status: "new" | FSRSState;
  learning_step: number;
  lapses: number;
  repetitions: number;
};

export type FSRSResult = {
  newStability: number;
  newDifficulty: number;
  newInterval: number;
  newDueDate: Date;
  newState: FSRSState;
  retrievabilityAtReview: number;
};

export const FSRS6_WEIGHTS = [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542] as const;
export const FSRS_DECAY = -0.5;
export const FSRS_FACTOR = 19 / 81;
export const DEFAULT_DESIRED_RETENTION = 0.9;
export const DEFAULT_LEARNING_STEPS_MINUTES = [1, 10] as const;
export const DEFAULT_RELEARNING_STEPS_MINUTES = [10] as const;

type FSRSOptions = { desiredRetention?: number; now?: Date; random?: () => number; fuzzFactorRange?: number; learningStepsMinutes?: readonly number[]; relearningStepsMinutes?: readonly number[] };

export function scheduleFSRS(card: FSRSCard, rating: FSRSRating, options: FSRSOptions = {}): FSRSResult {
  const now = options.now ? new Date(options.now) : new Date();
  const desiredRetention = Math.min(0.99, Math.max(0.7, options.desiredRetention ?? DEFAULT_DESIRED_RETENTION));
  const learningSteps = options.learningStepsMinutes ?? DEFAULT_LEARNING_STEPS_MINUTES;
  const relearningSteps = options.relearningStepsMinutes ?? DEFAULT_RELEARNING_STEPS_MINUTES;
  const isNew = card.status === "new";
  const isLearning = card.status === "learning" || card.status === "relearning";
  const currentStability = Math.max(0.1, card.stability ?? card.interval ?? 1);
  const currentDifficulty = clamp(card.difficulty ?? 5, 1, 10);
  const retrievability = card.last_review_at ? calculateRetrievability(daysSince(card.last_review_at, now), currentStability) : 1;

  if (isLearning) {
    const steps = card.status === "relearning" ? relearningSteps : learningSteps;
    if (rating === 1) return stepResult(card, now, steps[0], "relearning", currentStability, currentDifficulty, retrievability);
    if (rating === 4 || card.learning_step >= steps.length - 1) {
      return reviewResult(card, rating, now, desiredRetention, currentStability, currentDifficulty, retrievability);
    }
    return stepResult(card, now, steps[Math.min(card.learning_step + 1, steps.length - 1)], card.status === "relearning" ? "relearning" : "learning", currentStability, currentDifficulty, retrievability);
  }

  if (isNew && rating === 1) return stepResult(card, now, learningSteps[0], "learning", currentStability, currentDifficulty, retrievability);
  if (isNew && rating !== 4) return stepResult(card, now, learningSteps[0], "learning", currentStability, currentDifficulty, retrievability);
  return reviewResult(card, rating, now, desiredRetention, currentStability, currentDifficulty, retrievability, options);
}

function reviewResult(card: FSRSCard, rating: FSRSRating, now: Date, desiredRetention: number, stability: number, difficulty: number, retrievability: number, options: FSRSOptions = {}): FSRSResult {
  const initialDifficulty = calculateInitialDifficulty(rating);
  const newDifficulty = card.status === "new" ? initialDifficulty : updateDifficulty(difficulty, rating);
  const sameDay = Boolean(card.last_review_at && daysSince(card.last_review_at, now) < 1);
  const newStability = card.status === "new" ? calculateInitialStability(rating) : rating === 1 ? calculateLapseStability(newDifficulty, stability, retrievability) : sameDay ? calculateSameDayStability(stability, rating) : calculateRecallStability(stability, newDifficulty, retrievability, rating);
  const interval = calculateInterval(newStability, desiredRetention, options);
  const state: FSRSState = rating === 1 ? "relearning" : "review";
  return { newStability, newDifficulty, newInterval: interval, newDueDate: addDays(now, interval), newState: state, retrievabilityAtReview: retrievability };
}

function stepResult(card: FSRSCard, now: Date, minutes: number, state: FSRSState, stability: number, difficulty: number, retrievability: number): FSRSResult {
  return { newStability: stability, newDifficulty: difficulty, newInterval: 0, newDueDate: new Date(now.getTime() + minutes * 60_000), newState: state, retrievabilityAtReview: retrievability };
}

function calculateRetrievability(elapsedDays: number, stability: number): number {
  // R is the probability of recall after t elapsed days for memory stability S.
  return Math.pow(1 + FSRS_FACTOR * elapsedDays / stability, FSRS_DECAY);
}

function calculateInitialStability(rating: FSRSRating): number {
  // New-card stability uses w0 through w3 for Again through Easy.
  return Math.max(0.1, FSRS6_WEIGHTS[rating - 1]);
}

function calculateInitialDifficulty(rating: FSRSRating): number {
  // New-card difficulty is derived from w4 and w5, then constrained to 1 through 10.
  return clamp(FSRS6_WEIGHTS[4] - Math.exp(FSRS6_WEIGHTS[5] * (rating - 1)) + 1, 1, 10);
}

function updateDifficulty(difficulty: number, rating: FSRSRating): number {
  // D changes with the rating and is damped toward the Easy initial difficulty.
  const adjusted = difficulty + FSRS6_WEIGHTS[6] * (rating - 3) * ((10 - difficulty) / 9);
  const easyInitialDifficulty = calculateInitialDifficulty(4);
  return clamp(FSRS6_WEIGHTS[7] * easyInitialDifficulty + (1 - FSRS6_WEIGHTS[7]) * adjusted, 1, 10);
}

function calculateRecallStability(stability: number, difficulty: number, retrievability: number, rating: FSRSRating): number {
  // Successful recall grows S, with Hard penalty and Easy bonus multipliers.
  const gradeMultiplier = rating === 2 ? FSRS6_WEIGHTS[15] : rating === 4 ? FSRS6_WEIGHTS[16] : 1;
  const increase = Math.exp(FSRS6_WEIGHTS[8]) * (11 - difficulty) * Math.pow(stability, -FSRS6_WEIGHTS[9]) * (Math.exp(FSRS6_WEIGHTS[10] * (1 - retrievability)) - 1) * gradeMultiplier;
  return Math.max(stability, stability * (1 + increase));
}

function calculateSameDayStability(stability: number, rating: FSRSRating): number {
  // Same-day reviews use the FSRS same-day stability equation.
  return Math.max(0.1, stability * Math.exp(FSRS6_WEIGHTS[17] * (rating - 3 + FSRS6_WEIGHTS[18])) * Math.pow(stability, -FSRS6_WEIGHTS[19]));
}

function calculateLapseStability(difficulty: number, stability: number, retrievability: number): number {
  // Failed recall lowers S using the FSRS lapse formula.
  return Math.max(0.1, FSRS6_WEIGHTS[11] * Math.pow(difficulty, -FSRS6_WEIGHTS[12]) * (Math.pow(stability + 1, FSRS6_WEIGHTS[13]) - 1) * Math.exp(FSRS6_WEIGHTS[14] * (1 - retrievability)));
}

function calculateInterval(stability: number, desiredRetention: number, options: FSRSOptions): number {
  // The interval is the time until R reaches desired retention, with small fuzz.
  const rawInterval = (stability / FSRS_FACTOR) * (Math.pow(desiredRetention, 1 / FSRS_DECAY) - 1);
  const range = options.fuzzFactorRange ?? 0.05;
  const random = Math.min(1, Math.max(0, options.random ? options.random() : Math.random()));
  return Math.max(1, Math.round(rawInterval * (1 - range + random * range * 2)));
}

function daysSince(value: string, now: Date): number {
  return Math.max(0, (now.getTime() - new Date(value).getTime()) / 86_400_000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function optimizeParameters(reviewHistory: unknown[]): typeof FSRS6_WEIGHTS {
  return reviewHistory.length >= 1000 ? FSRS6_WEIGHTS : FSRS6_WEIGHTS;
}
