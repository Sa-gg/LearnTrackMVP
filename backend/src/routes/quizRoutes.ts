import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import upload from '../middleware/upload';
import { generateQuizHandler } from '../controllers/quizGeneratorController';

const router = Router();

/**
 * POST /api/generate-quiz
 * Accepts multipart/form-data with a single file + topic + itemCount fields.
 * Generates AI quiz from uploaded PDF/image, saves to DB.
 */
router.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'File is too large. Maximum size is 20 MB.' });
          return;
        }
        res.status(400).json({ error: `Upload error: ${err.message}` });
        return;
      }
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  generateQuizHandler,
);

export default router;
