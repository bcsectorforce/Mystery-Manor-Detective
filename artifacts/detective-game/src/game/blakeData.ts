import type { BlakeQuestionKey } from "./types";

export const BLAKE_QUESTIONS: Record<BlakeQuestionKey, {
  question: string;
  hint: string;
  answers: string[];
}> = {
  payment: {
    question: "How much do you think you should pay me?",
    hint: "Blake loves the 5 dollar bill",
    answers: ["5", "5 dollars", "$5", "5 dollar bill"],
  },
  color: {
    question: "What color am I thinking of?",
    hint: "Blake's favorite color is orange",
    answers: ["orange"],
  },
  year: {
    question: "What year was my birthday?",
    hint: "Blake's favorite year is 1989",
    answers: ["1989"],
  },
  city: {
    question: "What is my favorite city?",
    hint: "Blake lives in Boston",
    answers: ["boston"],
  },
  book: {
    question: "What is my favorite book?",
    hint: "Blake's favorite book is Trapped",
    answers: ["trapped"],
  },
  gpa: {
    question: "What was my GPA?",
    hint: "Blake's GPA was 3.92",
    answers: ["3.92"],
  },
  time: {
    question: "What time is it?",
    hint: "Blake is interested in 2:19",
    answers: ["2:19"],
  },
  language: {
    question: "What is my native language?",
    hint: "Blake speaks French",
    answers: ["french"],
  },
};

export const ALL_BLAKE_KEYS: BlakeQuestionKey[] = [
  "payment", "color", "year", "city", "book", "gpa", "time", "language",
];
