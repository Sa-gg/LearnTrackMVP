import { Request, Response } from 'express';
import { GoogleGenerativeAI, GoogleGenerativeAIError } from '@google/generative-ai';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChatRequestBody {
  prompt: string;
}

interface ChatSuccessResponse {
  reply: string;
}

interface ChatErrorResponse {
  error: string;
}

// ── Handler ────────────────────────────────────────────────────────────────────

/**
 * POST /api/chat
 * Body: { prompt: string }
 * Returns: { reply: string } on success, { error: string } on failure.
 *
 * NOTE (Prisma 7): When conversation history needs to be persisted we will use
 * the pg-adapter PrismaClient from src/lib/prisma.ts — not the legacy
 * datasources pattern. No DB queries are performed here yet.
 */
export const chatHandler = async (
  req: Request<{}, ChatSuccessResponse | ChatErrorResponse, ChatRequestBody>,
  res: Response<ChatSuccessResponse | ChatErrorResponse>,
): Promise<void> => {
  const { prompt } = req.body;

  // ── Input validation ────────────────────────────────────────────────────────
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    res.status(400).json({ error: 'Request body must include a non-empty "prompt" string.' });
    return;
  }

  // ── API key guard ───────────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.error('[geminiController] GEMINI_API_KEY is not configured.');
    res.status(500).json({ error: 'The AI service is not configured. Please contact the administrator.' });
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(prompt.trim());
    const reply = result.response.text();

    res.status(200).json({ reply });
  } catch (err) {
    // Handle Gemini SDK-specific errors (rate limit, invalid key, etc.)
    if (err instanceof GoogleGenerativeAIError) {
      console.error('[geminiController] Gemini API error:', err.message);
      res.status(502).json({ error: `AI service error: ${err.message}` });
      return;
    }

    // Handle generic timeouts / network errors
    if (err instanceof Error && err.message.toLowerCase().includes('timeout')) {
      console.error('[geminiController] Gemini API timeout:', err.message);
      res.status(504).json({ error: 'The AI service timed out. Please try again.' });
      return;
    }

    // Fallback
    console.error('[geminiController] Unexpected error:', err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
};
