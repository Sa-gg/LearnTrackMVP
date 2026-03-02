import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import api from '../lib/api';
import './TakeQuiz.css';

// ── Types ──────────────────────────────────────────────────────────────────────

interface QuestionData {
  id: number;
  questionText: string;
  options: string[];
  correctAnswer: string;
}

interface QuizData {
  id: number;
  title: string;
  topic: string;
  createdAt: string;
  questions: QuestionData[];
}

interface QuizErrorResponse {
  error: string;
}

/** Maps questionId → selected answer string */
type AnswerMap = Record<number, string>;

interface ScoreResult {
  correct: number;
  total: number;
  percentage: number;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface TakeQuizProps {
  quizId: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function TakeQuiz({ quizId }: TakeQuizProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch quiz on mount ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchQuiz = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const { data } = await api.get<QuizData>(`/api/quiz/${quizId}`);
        if (!cancelled) {
          setQuiz(data);
          setAnswers({});
          setScore(null);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const axiosErr = err as { response?: { status: number; data: QuizErrorResponse } };
        const msg = axiosErr.response?.data?.error;
        if (axiosErr.response?.status === 404) {
          setError(msg ?? 'Quiz not found.');
        } else {
          setError(msg ?? 'Failed to load quiz. Please try again.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchQuiz();
    return () => { cancelled = true; };
  }, [quizId]);

  // ── Answer selection ────────────────────────────────────────────────────
  const selectAnswer = useCallback((questionId: number, option: string): void => {
    if (score) return; // locked after submission
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  }, [score]);

  // ── Submit & score ──────────────────────────────────────────────────────
  const allAnswered =
    quiz !== null && quiz.questions.length > 0 && quiz.questions.every((q) => answers[q.id] !== undefined);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!quiz || !allAnswered) return;

    let correct = 0;
    for (const q of quiz.questions) {
      if (answers[q.id] === q.correctAnswer) correct++;
    }

    const total = quiz.questions.length;
    const percentage = Math.round((correct / total) * 100);
    setScore({ correct, total, percentage });
  };

  // ── Loading state ───────────────────────────────────────────────────────
  if (isLoading) {
    return <div className="card"><p className="tq__loading">Loading quiz…</p></div>;
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (error || !quiz) {
    return (
      <div className="card">
        <div className="error-banner" role="alert">
          <strong>Error: </strong>{error ?? 'An unexpected error occurred.'}
        </div>
      </div>
    );
  }

  // ── Quiz UI ─────────────────────────────────────────────────────────────
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 className="tq__heading">{quiz.title}</h2>
      <p className="tq__meta">Topic: {quiz.topic} · {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}</p>

      {/* Score banner */}
      {score && (
        <div className="score-banner">
          Score: {score.correct}/{score.total} ({score.percentage}%)
        </div>
      )}

      <form onSubmit={handleSubmit} className="tq__form">
        <ol className="tq__question-list">
          {quiz.questions.map((q, idx) => {
            const chosen = answers[q.id];
            const isSubmitted = score !== null;

            return (
              <li key={q.id} className="tq__question-card">
                <p className="tq__question-text">
                  {idx + 1}. {q.questionText}
                </p>
                <div className="tq__options-grid">
                  {q.options.map((opt) => {
                    const isSelected = chosen === opt;
                    const isCorrect = opt === q.correctAnswer;

                    let cls = 'tq__option-btn';
                    if (isSubmitted) {
                      if (isCorrect) cls += ' tq__option-btn--correct';
                      else if (isSelected) cls += ' tq__option-btn--wrong';
                    } else if (isSelected) {
                      cls += ' tq__option-btn--selected';
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={isSubmitted}
                        onClick={() => selectAnswer(q.id, opt)}
                        className={cls}
                      >
                        {opt}
                        {isSubmitted && isCorrect && ' ✓'}
                        {isSubmitted && isSelected && !isCorrect && ' ✗'}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>

        {!score && (
          <button
            type="submit"
            disabled={!allAnswered}
            className="btn btn--primary"
          >
            Submit Quiz
          </button>
        )}
      </form>
    </div>
  );
}
