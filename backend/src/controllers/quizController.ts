import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import type { QuizWithQuestions, QuizErrorResponse } from '../types/quiz';

// ── Types for route params ─────────────────────────────────────────────────────

interface QuizParams {
  id: string;
}

// ── Handler ────────────────────────────────────────────────────────────────────

/**
 * GET /api/quiz/:id
 * Fetches one quiz with all nested questions.
 *
 * Prisma 7 — uses the pg-adapter PrismaClient (src/lib/prisma.ts).
 */
export const getQuizHandler = async (
  req: Request<QuizParams, QuizWithQuestions | QuizErrorResponse>,
  res: Response<QuizWithQuestions | QuizErrorResponse>,
): Promise<void> => {
  const quizId = parseInt(req.params.id, 10);

  if (isNaN(quizId) || quizId <= 0) {
    res.status(400).json({ error: 'Invalid quiz ID.' });
    return;
  }

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found.' });
      return;
    }

    res.status(200).json({
      id: quiz.id,
      title: quiz.title,
      topic: quiz.topic,
      createdAt: quiz.createdAt.toISOString(),
      questions: quiz.questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
      })),
    });
  } catch (err) {
    console.error('[getQuiz] Database error:', err);
    res.status(500).json({ error: 'Failed to fetch quiz. Please try again.' });
  }
};
