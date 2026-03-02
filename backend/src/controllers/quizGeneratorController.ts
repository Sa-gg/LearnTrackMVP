import fs from 'fs';
import { Request, Response } from 'express';
import { GoogleGenerativeAI, GoogleGenerativeAIError } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { sanitizeAndParseJSON } from '../utils/sanitizeJSON';
import { prisma } from '../lib/prisma';
import type {
  GeneratedQuestion,
  GenerateQuizSuccessResponse,
  QuizErrorResponse,
} from '../types/quiz';

// ── Prompt engineering ─────────────────────────────────────────────────────────

function buildPrompt(topic: string, itemCount: number): string {
  return `You are a strict quiz-generation engine.

INSTRUCTIONS
1. Read the UPLOADED FILE carefully. It may be a PDF document or an image of a presentation/module.
2. Generate exactly ${itemCount} multiple-choice questions about the topic "${topic}" based ONLY on the content in the file.
3. Each question MUST have exactly 4 options.
4. Exactly one option must be the correct answer.

OUTPUT FORMAT — return ONLY a valid JSON array, no markdown, no explanation, no code fences.
Each element must match this schema exactly:
{
  "question": "<question text>",
  "options": ["<A>", "<B>", "<C>", "<D>"],
  "correctAnswer": "<the one correct option, verbatim from the options array>"
}`;
}

// ── Validation helpers ─────────────────────────────────────────────────────────

function isValidGeneratedQuestion(obj: unknown): obj is GeneratedQuestion {
  if (typeof obj !== 'object' || obj === null) return false;
  const q = obj as Record<string, unknown>;
  return (
    typeof q.question === 'string' &&
    Array.isArray(q.options) &&
    q.options.every((o: unknown) => typeof o === 'string') &&
    typeof q.correctAnswer === 'string' &&
    q.options.includes(q.correctAnswer)
  );
}

// ── Cleanup utility ────────────────────────────────────────────────────────────

function removeLocalFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[cleanup] Deleted local file: ${filePath}`);
    }
  } catch (err) {
    console.warn(`[cleanup] Failed to delete local file: ${filePath}`, err);
  }
}

// ── Handler ────────────────────────────────────────────────────────────────────

/**
 * POST /api/generate-quiz
 * Multipart: file (PDF or image), topic (string), itemCount (number)
 *
 * Uploads file to Google AI File Manager → passes URI to Gemini →
 * parses JSON → saves Quiz + Questions to PostgreSQL.
 * Cleans up local file in a finally block.
 *
 * Returns: { quizId, title, topic, questions }
 */
export const generateQuizHandler = async (
  req: Request,
  res: Response<GenerateQuizSuccessResponse | QuizErrorResponse>,
): Promise<void> => {
  const localFilePath = req.file?.path;

  try {
    // ── Input validation ──────────────────────────────────────────────────
    if (!req.file) {
      res.status(400).json({ error: 'A file (PDF or image) is required.' });
      return;
    }

    const topic = (req.body.topic as string | undefined)?.trim();
    const rawCount = Number(req.body.itemCount);

    if (!topic || topic.length === 0) {
      res.status(400).json({ error: '"topic" must be a non-empty string.' });
      return;
    }

    const validCounts = [5, 10, 15];
    if (!validCounts.includes(rawCount)) {
      res.status(400).json({ error: `"itemCount" must be one of: ${validCounts.join(', ')}.` });
      return;
    }
    const itemCount = rawCount;

    // ── API key guard ───────────────────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.error('[quizGenerator] GEMINI_API_KEY is not configured.');
      res.status(500).json({ error: 'The AI service is not configured. Please contact the administrator.' });
      return;
    }

    // ── Upload file to Google AI File Manager ─────────────────────────────
    const fileManager = new GoogleAIFileManager(apiKey);
    const mimeType = req.file.mimetype;
    const displayName = req.file.originalname;

    console.log(`[quizGenerator] Uploading "${displayName}" (${mimeType}) to Google AI…`);
    const uploadResult = await fileManager.uploadFile(localFilePath!, {
      mimeType,
      displayName,
    });

    const fileUri = uploadResult.file.uri;
    console.log(`[quizGenerator] File uploaded → URI: ${fileUri}`);

    // ── Call Gemini with the file reference ────────────────────────────────
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = buildPrompt(topic, itemCount);
    const result = await model.generateContent([
      { text: prompt },
      { fileData: { mimeType, fileUri } },
    ]);
    const rawText = result.response.text();

    console.log('[quizGenerator] Raw Gemini output:\n', rawText);

    // ── Parse & validate JSON ─────────────────────────────────────────────
    const parsed = sanitizeAndParseJSON<unknown[]>(rawText);

    if (!Array.isArray(parsed)) {
      res.status(502).json({ error: 'AI returned an unexpected format (expected a JSON array).' });
      return;
    }

    const questions: GeneratedQuestion[] = [];
    for (const item of parsed) {
      if (!isValidGeneratedQuestion(item)) {
        console.warn('[quizGenerator] Skipping malformed question:', item);
        continue;
      }
      questions.push(item);
    }

    if (questions.length === 0) {
      res.status(502).json({ error: 'AI failed to produce any valid questions. Try again with a different file.' });
      return;
    }

    // ── Persist to PostgreSQL via Prisma 7 ($transaction) ─────────────────
    const title = `${topic} Quiz`;

    const savedQuiz = await prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          title,
          topic,
          questions: {
            create: questions.map((q) => ({
              questionText: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
            })),
          },
        },
        include: { questions: true },
      });
      return quiz;
    });

    console.log(`[quizGenerator] Saved quiz id=${savedQuiz.id} with ${savedQuiz.questions.length} questions.`);

    res.status(201).json({
      quizId: savedQuiz.id,
      title: savedQuiz.title,
      topic: savedQuiz.topic,
      questions: savedQuiz.questions.map((q) => ({
        question: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
      })),
    });
  } catch (err) {
    if (err instanceof GoogleGenerativeAIError) {
      console.error('[quizGenerator] Gemini API error:', err.message);
      res.status(502).json({ error: `AI service error: ${err.message}` });
      return;
    }

    if (err instanceof Error && err.message.toLowerCase().includes('timeout')) {
      console.error('[quizGenerator] Gemini API timeout:', err.message);
      res.status(504).json({ error: 'The AI service timed out. Please try again.' });
      return;
    }

    if (err instanceof Error && err.message.startsWith('Failed to parse AI response')) {
      console.error('[quizGenerator] JSON parse error:', err.message);
      res.status(502).json({ error: 'AI returned malformed data. Please try again.' });
      return;
    }

    console.error('[quizGenerator] Unexpected error:', err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  } finally {
    // Always clean up the local temp file
    if (localFilePath) {
      removeLocalFile(localFilePath);
    }
  }
};
