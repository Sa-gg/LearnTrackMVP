import { Router } from 'express';
import { chatHandler } from '../controllers/geminiController';

const router = Router();

/**
 * POST /api/chat
 * Accepts { prompt: string }, proxies it to Gemini, returns { reply: string }.
 */
router.post('/', chatHandler);

export default router;
