import React, { useState, useEffect } from 'react';
import Card from './Card';

export default function PracticeSession({ selectedSets, onBackToDashboard }) {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    seen: 0
  });
  const [missedCards, setMissedCards] = useState([]);
  const [isFinished, setIsFinished] = useState(false);

  // Load and shuffle cards from selected sets
  useEffect(() => {
    let combinedCards = [];
    selectedSets.forEach(set => {
      if (set.cards && set.cards.length > 0) {
        // Attach set name for reference in summary
        const cardsWithMetadata = set.cards.map(card => ({
          ...card,
          setName: set.name
        }));
        combinedCards = [...combinedCards, ...cardsWithMetadata];
      }
    });

    // Shuffle the cards
    const shuffled = [...combinedCards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
  }, [selectedSets]);

  // Keyboard controls for active session and end screen
  useEffect(() => {
    if (cards.length === 0) return;

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();

      if (isFinished) {
        if (key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (missedCards.length > 0) {
            handleRestart(true); // Retry failures
          } else {
            handleRestart(false); // Retry all
          }
        } else if (key === '1') {
          onBackToDashboard();
        } else if (key === '2') {
          handleRestart(false); // Retry all
        }
        return;
      }

      if (key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (isFlipped) {
        if (key === '1' || key === 'w') {
          handleAnswer(false);
        } else if (key === '2' || key === 'r' || key === 'c') {
          handleAnswer(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentIndex, cards, isFinished, missedCards, onBackToDashboard]);

  const handleAnswer = (isCorrect) => {
    const currentCard = cards[currentIndex];
    
    // Update stats
    setSessionStats(prev => {
      const nextStats = {
        ...prev,
        seen: prev.seen + 1
      };
      if (isCorrect) {
        nextStats.correct += 1;
      } else {
        nextStats.incorrect += 1;
      }
      return nextStats;
    });

    // Track missed cards
    if (!isCorrect) {
      setMissedCards(prev => [...prev, currentCard]);
    }

    // Move to next card or finish
    if (currentIndex + 1 < cards.length) {
      setIsFlipped(false);
      // Wait for flip transition to start resetting card content
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 200);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = (practiceOnlyMissed = false) => {
    const baseCards = practiceOnlyMissed ? missedCards : cards;
    const shuffled = [...baseCards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionStats({ correct: 0, incorrect: 0, seen: 0 });
    setMissedCards([]);
    setIsFinished(false);
  };

  if (cards.length === 0) {
    return (
      <div className="panel end-screen">
        <h2>No Cards Found</h2>
        <p className="text-secondary">The selected card sets do not contain any flashcards.</p>
        <button className="btn btn-primary" onClick={onBackToDashboard}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;
  const progressPercentage = (currentIndex / totalCards) * 100;
  
  // Calculate accuracy
  const totalAnswered = sessionStats.correct + sessionStats.incorrect;
  const accuracy = totalAnswered > 0 
    ? Math.round((sessionStats.correct / totalAnswered) * 100) 
    : 0;

  if (isFinished) {
    return (
      <div className="session-container transition-fade">
        <div className="panel end-screen">
          <h2>Session Complete! 🎉</h2>
          
          <div className="score-circle">
            <span className="score-number">{accuracy}%</span>
            <span className="score-label">Accuracy</span>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-value">{totalCards}</div>
              <div className="stat-card-label">Total Cards</div>
            </div>
            <div className="stat-card-value correct stat-card">
              <div className="stat-card-value correct">{sessionStats.correct}</div>
              <div className="stat-card-label">Correct</div>
            </div>
            <div className="stat-card-value incorrect stat-card">
              <div className="stat-card-value incorrect">{sessionStats.incorrect}</div>
              <div className="stat-card-label">Incorrect</div>
            </div>
          </div>

          {missedCards.length > 0 && (
            <div className="missed-cards-section">
              <h3 className="missed-cards-title">Cards to Review ({missedCards.length})</h3>
              <div className="missed-card-list">
                {missedCards.map((card, idx) => (
                  <div key={card.id || idx} className="missed-card-item">
                    <div className="missed-card-prompt">Q: {card.front}</div>
                    <div className="missed-card-answer">A: {card.back}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="controls-container" style={{ flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={onBackToDashboard}>
                Dashboard [1]
              </button>
              {missedCards.length > 0 && (
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleRestart(true)}
                >
                  Practice Missed Cards [Space]
                </button>
              )}
              <button className="btn btn-primary" onClick={() => handleRestart(false)}>
                Restart Session {missedCards.length > 0 ? '[2]' : '[Space]'}
              </button>
            </div>
            <div className="keyboard-hint" style={{ marginTop: '4px' }}>
              {missedCards.length > 0 ? (
                <span>Press <strong>Space</strong> to practice missed cards, <strong>2</strong> to restart whole set, or <strong>1</strong> for Dashboard</span>
              ) : (
                <span>Press <strong>Space</strong> to restart session or <strong>1</strong> for Dashboard</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="session-container transition-fade">
      <div className="session-header">
        <button className="btn btn-secondary btn-sm" onClick={onBackToDashboard}>
          ← Quit Practice
        </button>
        
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="stats-bubbles">
          <div className="stat-bubble correct">
            ✓ {sessionStats.correct}
          </div>
          <div className="stat-bubble incorrect">
            ✗ {sessionStats.incorrect}
          </div>
          <div className="stat-bubble accuracy">
            🎯 {accuracy}%
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        Card {currentIndex + 1} of {totalCards}
      </div>

      <Card 
        front={currentCard.front} 
        back={currentCard.back} 
        isFlipped={isFlipped}
        onFlip={() => setIsFlipped(!isFlipped)}
      />

      <div className="controls-container">
        {!isFlipped ? (
          <button className="btn btn-primary btn-lg" style={{ minWidth: '200px' }} onClick={() => setIsFlipped(true)}>
            Reveal Answer
          </button>
        ) : (
          <>
            <button 
              className="btn btn-danger btn-lg" 
              style={{ minWidth: '140px' }}
              onClick={() => handleAnswer(false)}
            >
              ❌ Wrong [1]
            </button>
            <button 
              className="btn btn-success btn-lg" 
              style={{ minWidth: '140px' }}
              onClick={() => handleAnswer(true)}
            >
              ✅ Correct [2]
            </button>
          </>
        )}
      </div>
      
      <div className="keyboard-hint">
        {!isFlipped ? (
          <span>Press <strong>Space</strong> or click card to reveal answer</span>
        ) : (
          <span>Press <strong>1</strong> or <strong>W</strong> for Wrong, <strong>2</strong> or <strong>R</strong> for Correct</span>
        )}
      </div>
    </div>
  );
}
