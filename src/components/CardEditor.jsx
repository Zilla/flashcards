import React, { useState, useEffect } from 'react';

export default function CardEditor({ editingSet, onSave, onCancel }) {
  const [setName, setSetName] = useState('');
  const [cards, setCards] = useState([]);
  const [configPaths, setConfigPaths] = useState([]);
  const [selectedDirectory, setSelectedDirectory] = useState('');
  const [customDirectory, setCustomDirectory] = useState('');
  const [showCustomDirInput, setShowCustomDirInput] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch configuration search paths
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json();
          setConfigPaths(data.searchPaths || []);
          if (data.searchPaths && data.searchPaths.length > 0) {
            setSelectedDirectory(data.searchPaths[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching config:', err);
      }
    }
    fetchConfig();
  }, []);

  // Initialize form if editing an existing set
  useEffect(() => {
    if (editingSet) {
      setSetName(editingSet.name || '');
      setCards(editingSet.cards || []);
      
      // Determine folder from filePath
      if (editingSet.filePath) {
        // Simple client-side path folder extraction
        const folder = editingSet.filePath.substring(0, editingSet.filePath.lastIndexOf(editingSet.filePath.includes('/') ? '/' : '\\'));
        setSelectedDirectory(folder);
      }
    } else {
      setSetName('');
      setCards([{ front: '', back: '' }]);
    }
  }, [editingSet]);

  // Global keybind: Alt + N to add card
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleAddCard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddCard = () => {
    setCards(prev => {
      const newCards = [...prev, { front: '', back: '' }];
      setTimeout(() => {
        const newIdx = newCards.length - 1;
        const el = document.getElementById(`front-input-${newIdx}`);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return newCards;
    });
  };

  const handleRemoveCard = (index) => {
    setCards(prev => prev.filter((_, i) => i !== index));
  };

  const handleCardChange = (index, field, value) => {
    setCards(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleDirectoryChange = (e) => {
    const value = e.target.value;
    setSelectedDirectory(value);
    if (value === '__custom__') {
      setShowCustomDirInput(true);
    } else {
      setShowCustomDirInput(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!setName.trim()) {
      setError('Card set name is required.');
      return;
    }

    if (cards.length === 0) {
      setError('At least one flashcard is required.');
      return;
    }

    const hasEmptyCards = cards.some(c => !c.front.trim() || !c.back.trim());
    if (hasEmptyCards) {
      setError('All cards must have both a Prompt (Front) and an Answer (Back).');
      return;
    }

    setIsSaving(true);

    try {
      const savePath = showCustomDirInput ? customDirectory.trim() : selectedDirectory;
      if (showCustomDirInput && !savePath) {
        setError('Please enter a custom directory path.');
        setIsSaving(false);
        return;
      }

      let payload = {
        name: setName.trim(),
        cards: cards.map(c => ({
          front: c.front.trim(),
          back: c.back.trim()
        }))
      };

      let url = '/api/sets';
      let method = 'POST';

      if (editingSet) {
        payload.filePath = editingSet.filePath;
        method = 'PUT';
      } else {
        payload.saveDirectory = savePath;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save card set');
      }

      const savedSet = await response.json();
      onSave(savedSet);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while saving the set.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="editor-container transition-fade">
      <div className="panel">
        <h2 style={{ marginBottom: '20px' }}>
          {editingSet ? `Edit Set: ${editingSet.name}` : 'Create New Flashcard Set'}
        </h2>

        {error && (
          <div className="panel" style={{ backgroundColor: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: '#f87171', padding: '12px 16px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="editor-header-fields">
            <div className="form-group">
              <label className="form-label">Set Title</label>
              <input
                type="text"
                className="input-text"
                placeholder="e.g. Spanish Vocabulary, Dog Body Language..."
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Save Directory</label>
              {editingSet ? (
                <input
                  type="text"
                  className="input-text"
                  value={selectedDirectory}
                  disabled={true}
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              ) : (
                <select
                  className="select-dropdown"
                  value={selectedDirectory}
                  onChange={handleDirectoryChange}
                  disabled={isSaving}
                >
                  {configPaths.map((p, idx) => (
                    <option key={idx} value={p}>
                      {p === '.' || p.startsWith('./') ? p + ' (Workspace)' : p}
                    </option>
                  ))}
                  <option value="__custom__">+ Custom path...</option>
                </select>
              )}
            </div>
          </div>

          {!editingSet && showCustomDirInput && (
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Custom Save Directory Path (Absolute or Workspace-relative)</label>
              <input
                type="text"
                className="input-text"
                placeholder="e.g. C:\Users\Username\Desktop\my_cards  or  ./custom-folder"
                value={customDirectory}
                onChange={(e) => setCustomDirectory(e.target.value)}
                disabled={isSaving}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '32px 0 16px' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Flashcards ({cards.length})</h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddCard}
              disabled={isSaving}
              title="Add a new card (Alt + N)"
            >
              + Add Card <span style={{ opacity: 0.6, fontSize: '0.75rem', marginLeft: '4px' }}>[Alt+N]</span>
            </button>
          </div>

          <div className="editor-cards-section">
            {cards.map((card, idx) => (
              <div key={idx} className="editor-card-row">
                <span className="card-index-tag">#{idx + 1}</span>
                
                <div className="editor-inputs">
                  <textarea
                    id={`front-input-${idx}`}
                    className="textarea-input"
                    placeholder="Front side (Prompt / Question)"
                    value={card.front}
                    onChange={(e) => handleCardChange(idx, 'front', e.target.value)}
                    disabled={isSaving}
                    required
                  />
                  <textarea
                    className="textarea-input"
                    placeholder="Back side (Answer / Explanation)"
                    value={card.back}
                    onChange={(e) => handleCardChange(idx, 'back', e.target.value)}
                    disabled={isSaving}
                    required
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleRemoveCard(idx)}
                  disabled={isSaving || cards.length === 1}
                  style={{ alignSelf: 'center' }}
                  title="Remove card"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>

          {cards.length === 0 && (
            <div className="empty-state">
              No cards added yet. Click "+ Add Card" to create your first flashcard.
            </div>
          )}

          <div className="controls-container" style={{ marginTop: '32px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Card Set'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
