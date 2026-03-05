import { gradeAnswer, type AnswerFormat } from "@/lib/grader";

export type GradeRequest = {
  userInput: string;
  expected: string;
  format: AnswerFormat;
  typeId?: string;
  expectedForm?: "mixed" | "improper" | "auto";
};

export const gradeProblemAnswer = ({ userInput, expected, format, typeId, expectedForm }: GradeRequest) =>
  gradeAnswer(userInput, expected, format, { typeId, expectedForm });
