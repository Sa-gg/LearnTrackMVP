import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChangeEvent, FormEvent, DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import './QuizGenerator.css';

// ── Types ──────────────────────────────────────────────────────────────────────

interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface GenerateQuizResponse {
  quizId: number;
  title: string;
  topic: string;
  questions: GeneratedQuestion[];
}

interface GenerateQuizErrorResponse {
  error: string;
}

type ItemCount = 5 | 10 | 15;

// ── Status messages shown during upload/processing ─────────────────────────────

const STATUS_MESSAGES = [
  'Uploading your file…',
  'AI is reading the module…',
  'Generating quiz questions…',
  'Almost done…',
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function QuizGenerator() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [topic, setTopic] = useState<string>('');
  const [itemCount, setItemCount] = useState<ItemCount>(5);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [savedQuizId, setSavedQuizId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [statusIdx, setStatusIdx] = useState<number>(0);

  // Cycle through loading status messages every 4 seconds
  useEffect(() => {
    if (!isLoading) {
      setStatusIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Auto-scroll to results
  useEffect(() => {
    if (questions.length > 0) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [questions]);

  // ── File selection helpers ──────────────────────────────────────────────

  const acceptFile = useCallback((incoming: File | null) => {
    if (!incoming) return;
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowed.includes(incoming.type)) {
      setError(`Unsupported file type "${incoming.type}". Upload a PDF or image.`);
      return;
    }
    if (incoming.size > 20 * 1024 * 1024) {
      setError('File is too large. Maximum size is 20 MB.');
      return;
    }
    setError(null);
    setFile(incoming);
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    acceptFile(e.target.files?.[0] ?? null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragOver(false);
    acceptFile(e.dataTransfer.files[0] ?? null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (): void => {
    setIsDragOver(false);
  };

  const removeFile = (): void => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!file || !topic.trim() || isLoading) return;

    setError(null);
    setQuestions([]);
    setSavedQuizId(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('topic', topic.trim());
      formData.append('itemCount', String(itemCount));

      const { data } = await api.post<GenerateQuizResponse>(
        '/api/generate-quiz',
        formData,
        {
          // Let the browser set the multipart boundary automatically
          headers: { 'Content-Type': undefined as unknown as string },
          timeout: 120_000, // 2 min — large files take longer
        },
      );
      setQuestions(data.questions);
      setSavedQuizId(data.quizId);
    } catch (err: unknown) {
      const axiosError = err as { response?: { status: number; data: GenerateQuizErrorResponse } };
      const status = axiosError.response?.status;
      const serverMessage = axiosError.response?.data?.error;

      let displayMessage: string;
      if (status === 400) {
        displayMessage = serverMessage ?? 'Invalid input. Please check your fields.';
      } else if (status === 502) {
        displayMessage = serverMessage ?? 'The AI returned bad data. Please try again.';
      } else if (status === 504) {
        displayMessage = serverMessage ?? 'The AI timed out. Please try again.';
      } else if (status === 500) {
        displayMessage = serverMessage ?? 'Server error. Please try again later.';
      } else {
        displayMessage = 'Could not reach the server. Check your connection and try again.';
      }

      setError(displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = file !== null && topic.trim().length > 0;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h2 className="qgen__heading">AI Quiz Generator</h2>
      <p className="qgen__subtitle">
        Upload a DepEd PDF module or image-based PPT and let the AI generate quiz questions automatically.
      </p>

      {/* ── Loading overlay ───────────────────────────────────────────── */}
      {isLoading && (
        <div className="qgen__loading-overlay">
          <div className="qgen__spinner" />
          <p className="qgen__loading-text">{STATUS_MESSAGES[statusIdx]}</p>
        </div>
      )}

      {/* ── Form ──────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="qgen__form">
        <label className="qgen__label">
          Topic
          <input
            type="text"
            value={topic}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTopic(e.target.value)}
            placeholder="e.g. Photosynthesis, Araling Panlipunan, React Hooks"
            disabled={isLoading}
          />
        </label>

        <label className="qgen__label">
          Number of Questions
          <select
            value={itemCount}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setItemCount(Number(e.target.value) as ItemCount)}
            disabled={isLoading}
          >
            <option value={5}>5 questions</option>
            <option value={10}>10 questions</option>
            <option value={15}>15 questions</option>
          </select>
        </label>

        {/* ── Dropzone ──────────────────────────────────────────────── */}
        <div className="qgen__label">Upload Module File</div>

        <div
          className={`qgen__dropzone${isDragOver ? ' qgen__dropzone--active' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileChange}
            className="qgen__file-input"
            disabled={isLoading}
          />

          {file ? (
            <div className="qgen__file-preview">
              <span className="qgen__file-icon">📄</span>
              <div className="qgen__file-info">
                <span className="qgen__file-name">{file.name}</span>
                <span className="qgen__file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <button
                type="button"
                className="qgen__file-remove"
                onClick={(e) => { e.stopPropagation(); removeFile(); }}
                aria-label="Remove file"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="qgen__dropzone-content">
              <span className="qgen__dropzone-icon">📁</span>
              <p className="qgen__dropzone-text">
                Drag & drop your PDF or image here, or <strong>click to browse</strong>
              </p>
              <p className="qgen__dropzone-hint">Supports PDF, PNG, JPEG, WebP · Max 20 MB</p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !isFormValid}
          className="btn btn--primary"
        >
          {isLoading ? 'Processing…' : 'Generate Quiz'}
        </button>
      </form>

      {/* ── Error banner ──────────────────────────────────────────────── */}
      {error && (
        <div className="error-banner" role="alert">
          <strong>Error: </strong>{error}
          <button onClick={() => setError(null)} className="dismiss-btn" aria-label="Dismiss error">
            ✕
          </button>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────── */}
      {questions.length > 0 && (
        <div ref={resultsRef} className="qgen__results">
          <div className="qgen__results-header">
            <h3 className="qgen__results-heading">
              Generated {questions.length} Question{questions.length !== 1 ? 's' : ''}
            </h3>
            {savedQuizId && (
              <button
                onClick={() => navigate(`/quiz/${savedQuizId}`)}
                className="btn btn--success"
              >
                Take This Quiz →
              </button>
            )}
          </div>
          <ol className="qgen__question-list">
            {questions.map((q, idx) => (
              <li key={idx} className="qgen__question-card">
                <p className="qgen__question-text">{q.question}</p>
                <ul className="qgen__options-list">
                  {q.options.map((opt, optIdx) => (
                    <li
                      key={optIdx}
                      className={`qgen__option ${opt === q.correctAnswer ? 'qgen__option--correct' : ''}`}
                    >
                      {opt}
                      {opt === q.correctAnswer && ' ✓'}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
