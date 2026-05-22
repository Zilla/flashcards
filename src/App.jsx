import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import PracticeSession from './components/PracticeSession';
import CardEditor from './components/CardEditor';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'practice', 'editor'
  const [cardSets, setCardSets] = useState([]);
  const [selectedSets, setSelectedSets] = useState([]);
  const [editingSet, setEditingSet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load all sets on mount
  useEffect(() => {
    fetchSets();
  }, []);

  const fetchSets = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/sets');
      if (!response.ok) {
        throw new Error('Failed to load flashcard sets');
      }
      const data = await response.json();
      setCardSets(data);
    } catch (err) {
      console.error(err);
      setError('Could not connect to the backend server. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPractice = (sets) => {
    // We need to fetch the full details (cards) of each selected set
    // because the dashboard sets list only returns metadata (filePath, name, cardCount)
    setIsLoading(true);
    Promise.all(
      sets.map(async (set) => {
        const response = await fetch(`/api/sets/by-path?filePath=${encodeURIComponent(set.filePath)}`);
        if (!response.ok) {
          throw new Error(`Failed to load cards for set: ${set.name}`);
        }
        return response.json();
      })
    )
      .then((fullSets) => {
        setSelectedSets(fullSets);
        setCurrentView('practice');
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || 'Failed to load selected card sets');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleEditSet = async (setMeta) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sets/by-path?filePath=${encodeURIComponent(setMeta.filePath)}`);
      if (!response.ok) {
        throw new Error(`Failed to load cards for editing`);
      }
      const fullSet = await response.json();
      // Attach filePath to the fullSet so the editor knows what to update
      fullSet.filePath = setMeta.filePath;
      setEditingSet(fullSet);
      setCurrentView('editor');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load card set for editing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewSet = () => {
    setEditingSet(null);
    setCurrentView('editor');
  };

  const handleDeleteSet = async (filePath) => {
    setError('');
    try {
      const response = await fetch(`/api/sets?filePath=${encodeURIComponent(filePath)}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete card set');
      }
      // Refresh list
      fetchSets();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to delete card set');
    }
  };

  const handleEditorSave = (savedSet) => {
    setCurrentView('dashboard');
    fetchSets();
  };

  return (
    <div className="app-container">
      <header className="header">
        <a href="#" className="logo" onClick={() => setCurrentView('dashboard')}>
          <span className="logo-icon">⚡</span>
          <span className="logo-text">Antigravity Flashcards</span>
        </a>
        <div style={{ display: 'flex', gap: '10px' }}>
          {currentView !== 'dashboard' && (
            <button className="btn btn-secondary btn-sm" onClick={() => setCurrentView('dashboard')}>
              Dashboard Home
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={fetchSets} disabled={isLoading}>
            🔄 Refresh Sets
          </button>
        </div>
      </header>

      {error && (
        <div className="panel" style={{ backgroundColor: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: '#f87171', padding: '16px', marginBottom: '24px', borderRadius: 'var(--radius-md)' }}>
          <strong>Error:</strong> {error}
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: '16px' }} onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, minHeight: '200px' }}>
          <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
            Loading cards & configurations... 🧪
          </div>
        </div>
      )}

      {!isLoading && currentView === 'dashboard' && (
        <Dashboard
          cardSets={cardSets}
          onStartPractice={handleStartPractice}
          onCreateNewSet={handleCreateNewSet}
          onEditSet={handleEditSet}
          onDeleteSet={handleDeleteSet}
          onRefreshSets={fetchSets}
        />
      )}

      {!isLoading && currentView === 'practice' && (
        <PracticeSession
          selectedSets={selectedSets}
          onBackToDashboard={() => setCurrentView('dashboard')}
        />
      )}

      {!isLoading && currentView === 'editor' && (
        <CardEditor
          editingSet={editingSet}
          onSave={handleEditorSave}
          onCancel={() => setCurrentView('dashboard')}
        />
      )}
    </div>
  );
}
