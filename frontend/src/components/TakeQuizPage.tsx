import { useParams } from 'react-router-dom';
import TakeQuiz from './TakeQuiz';

/**
 * Route wrapper – extracts :id from URL and passes it as a prop
 * to the TakeQuiz component (which is route-agnostic).
 */
export default function TakeQuizPage() {
  const { id } = useParams<{ id: string }>();
  const quizId = Number(id);

  if (!id || isNaN(quizId) || quizId <= 0) {
    return (
      <div style={{ maxWidth: '720px', margin: '3rem auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ color: '#b91c1c' }}>Invalid quiz ID. Please check the URL.</p>
      </div>
    );
  }

  return <TakeQuiz quizId={quizId} />;
}
