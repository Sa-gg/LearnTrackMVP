import { Router } from 'express';
import { getQuizHandler } from '../controllers/quizController';

const router = Router();

/**
 * GET /api/quiz/:id
 * Fetches a quiz and all its nested questions by ID.
 */
router.get('/:id', getQuizHandler);

export default router;
