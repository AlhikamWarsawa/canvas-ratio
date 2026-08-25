export type FlashcardStatus = "new" | "learning" | "review" | "relearning";

export type FlashcardDeck = {
  id: string;
  name: string;
  description: string;
  created_at: string;
};

export type Flashcard = {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  image_url?: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  due_date: string;
  due_at: string;
  status: FlashcardStatus;
  lapses: number;
  learning_step: number;
};

export type FlashcardStore = {
  decks: FlashcardDeck[];
  cards: Flashcard[];
  settings: { newCardsPerDay: number; maxReviewsPerDay: number };
};
