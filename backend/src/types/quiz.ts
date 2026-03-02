// ── Shared types for AI quiz generation & retrieval ─────────────────────────

/** Shape of a single question as returned by the Gemini AI. */
export interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

/** POST /api/generate-quiz – request body */
export interface GenerateQuizRequestBody {
  sourceText: string;
  topic: string;
  itemCount: number;
}

/** POST /api/generate-quiz – success response (now includes saved quiz ID) */
export interface GenerateQuizSuccessResponse {
  quizId: number;
  title: string;
  topic: string;
  questions: GeneratedQuestion[];
}

/** GET /api/quiz/:id – response */
export interface QuizWithQuestions {
  id: number;
  title: string;
  topic: string;
  createdAt: string;
  questions: {
    id: number;
    questionText: string;
    options: string[];
    correctAnswer: string;
  }[];
}

/** Standard error response */
export interface QuizErrorResponse {
  error: string;
}

/** @deprecated Use QuizErrorResponse instead */
export type GenerateQuizErrorResponse = QuizErrorResponse;
