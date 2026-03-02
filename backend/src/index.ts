import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
import chatRoutes from './routes/chatRoutes';
import quizRoutes from './routes/quizRoutes';
import quizRetrievalRoutes from './routes/quizRetrievalRoutes';
app.use('/api/chat', chatRoutes);
app.use('/api/generate-quiz', quizRoutes);
app.use('/api/quiz', quizRetrievalRoutes);

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
});

export default app;
