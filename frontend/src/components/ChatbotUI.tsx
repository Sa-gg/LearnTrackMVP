import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import api from '../lib/api';
import './ChatbotUI.css';

// ── Types ──────────────────────────────────────────────────────────────────────

type Role = 'user' | 'ai';

interface Message {
  id: number;
  role: Role;
  text: string;
}

interface ChatResponse {
  reply: string;
}

interface ChatErrorResponse {
  error: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ChatbotUI() {
  const [prompt, setPrompt] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const messageCounter = useRef<number>(0);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: Role, text: string): void => {
    messageCounter.current += 1;
    setMessages((prev) => [...prev, { id: messageCounter.current, role, text }]);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isLoading) return;

    setError(null);
    addMessage('user', trimmedPrompt);
    setPrompt('');
    setIsLoading(true);

    try {
      const { data } = await api.post<ChatResponse>('/api/chat', { prompt: trimmedPrompt });
      addMessage('ai', data.reply);
    } catch (err: unknown) {
      const axiosError = err as { response?: { status: number; data: ChatErrorResponse } };
      const status = axiosError.response?.status;
      const serverMessage = axiosError.response?.data?.error;

      let displayMessage: string;
      if (status === 500 || status === 502 || status === 504) {
        displayMessage = serverMessage ?? 'The server encountered an error. Please try again.';
      } else if (status === 400) {
        displayMessage = serverMessage ?? 'Invalid request. Please check your input.';
      } else {
        displayMessage = 'Could not reach the server. Check your connection and try again.';
      }

      setError(displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 className="chat__heading">LearnTrack AI Assistant</h2>

      {/* ── Conversation history ─────────────────────────────────────── */}
      <div className="chat__conversation">
        {messages.length === 0 && (
          <p className="chat__placeholder">Ask me anything about your learning topics…</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat__bubble chat__bubble--${msg.role}`}
          >
            <span className="chat__role-label">{msg.role === 'user' ? 'You' : 'AI'}</span>
            <p className="chat__message-text">{msg.text}</p>
          </div>
        ))}
        {isLoading && (
          <div className="chat__bubble chat__bubble--loading">
            <span className="chat__role-label">AI</span>
            <p className="chat__message-text">Thinking…</p>
          </div>
        )}
        <div ref={conversationEndRef} />
      </div>

      {/* ── Error banner ─────────────────────────────────────────────── */}
      {error && (
        <div className="error-banner" role="alert">
          <strong>Error: </strong>{error}
          <button onClick={() => setError(null)} className="dismiss-btn" aria-label="Dismiss error">✕</button>
        </div>
      )}

      {/* ── Input form ───────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="chat__form">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type your question here…"
          rows={3}
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={isLoading || prompt.trim().length === 0}
          className="btn btn--primary chat__send-btn"
        >
          {isLoading ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
