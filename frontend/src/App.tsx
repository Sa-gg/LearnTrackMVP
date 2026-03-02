import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom';
import ChatbotUI from './components/ChatbotUI';
import QuizGenerator from './components/QuizGenerator';
import TakeQuizPage from './components/TakeQuizPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <header className="navbar">
        <Link to="/" className="navbar__brand">
          <span className="navbar__logo">LT</span>
          LearnTrack
        </Link>
        <nav className="navbar__links">
          <NavLink to="/generate" className={({ isActive }) => isActive ? 'nav-link nav-link--active' : 'nav-link'}>
            Generate Quiz
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => isActive ? 'nav-link nav-link--active' : 'nav-link'}>
            AI Chat
          </NavLink>
        </nav>
      </header>

      {/* ── Page container ──────────────────────────────────────────── */}
      <main className="page-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<ChatbotUI />} />
          <Route path="/generate" element={<QuizGenerator />} />
          <Route path="/quiz/:id" element={<TakeQuizPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

function Home() {
  return (
    <section className="card home-hero">
      <h1 className="home-hero__title">Welcome to <span className="text-primary">LearnTrack</span></h1>
      <p className="home-hero__subtitle">
        An AI-powered educational platform. Paste any study material, generate quizzes instantly with Gemini AI, and test your knowledge — all in one place.
      </p>
      <div className="home-hero__actions">
        <Link to="/generate" className="btn btn--primary">Generate a Quiz</Link>
        <Link to="/chat" className="btn btn--secondary">AI Chat Assistant</Link>
      </div>
    </section>
  );
}
