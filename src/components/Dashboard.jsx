import React, { useState, useEffect } from 'react';

export default function Dashboard({ 
  cardSets, 
  onStartPractice, 
  onCreateNewSet, 
  onEditSet, 
  onDeleteSet,
  onRefreshSets
}) {
  const [selectedPaths, setSelectedPaths] = useState([]);
  const [configPaths, setConfigPaths] = useState([]);
  const [newPathInput, setNewPathInput] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [configError, setConfigError] = useState('');

  // Fetch search path configuration
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const data = await response.json();
        setConfigPaths(data.searchPaths || []);
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  const handleAddPath = async (e) => {
    e.preventDefault();
    setConfigError('');
    if (!newPathInput.trim()) return;

    try {
      const response = await fetch('/api/config/paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPath: newPathInput.trim() })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add search path');
      }

      const data = await response.json();
      setConfigPaths(data.searchPaths || []);
      setNewPathInput('');
      onRefreshSets(); // reload sets from new path
    } catch (err) {
      setConfigError(err.message);
    }
  };

  const handleRemovePath = async (targetPath) => {
    setConfigError('');
    if (configPaths.length <= 1) {
      setConfigError('You must keep at least one search path.');
      return;
    }

    try {
      const response = await fetch('/api/config/paths', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove search path');
      }

      const data = await response.json();
      setConfigPaths(data.searchPaths || []);
      onRefreshSets(); // reload sets list
    } catch (err) {
      setConfigError(err.message);
    }
  };

  const handleToggleSelect = (filePath) => {
    setSelectedPaths(prev => {
      if (prev.includes(filePath)) {
        return prev.filter(p => p !== filePath);
      } else {
        return [...prev, filePath];
      }
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedPaths.length === cardSets.length) {
      setSelectedPaths([]);
    } else {
      setSelectedPaths(cardSets.map(set => set.filePath));
    }
  };

  const handleStart = () => {
    if (selectedPaths.length === 0) return;
    const selectedSets = cardSets.filter(set => selectedPaths.includes(set.filePath));
    onStartPractice(selectedSets);
  };

  const handleDeleteClick = (e, set) => {
    e.stopPropagation(); // prevent selection toggle
    if (window.confirm(`Are you sure you want to delete "${set.name}"? This will delete the file from your computer.`)) {
      onDeleteSet(set.filePath);
      setSelectedPaths(prev => prev.filter(p => p !== set.filePath));
    }
  };

  const handleEditClick = (e, set) => {
    e.stopPropagation(); // prevent selection toggle
    onEditSet(set);
  };

  // Calculate totals for floating bar
  const selectedSets = cardSets.filter(set => selectedPaths.includes(set.filePath));
  const totalSelectedCards = selectedSets.reduce((sum, set) => sum + set.cardCount, 0);

  return (
    <div className="transition-fade">
      {/* Configuration Section */}
      <div className="config-section">
        <div className="config-header" onClick={() => setShowConfig(!showConfig)}>
          <h3 className="config-title">
            ⚙️ {showConfig ? 'Hide' : 'Show'} Configuration & Search Paths
          </h3>
          <span>{showConfig ? '▲' : '▼'}</span>
        </div>

        {showConfig && (
          <div style={{ marginTop: '16px' }}>
            <p className="text-secondary" style={{ marginBottom: '12px', fontSize: '0.9rem' }}>
              The backend searches the folders below for flashcard `.json` sets. You can add external directories to search them as well.
            </p>

            {configError && (
              <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '8px' }}>
                ⚠️ {configError}
              </div>
            )}

            <div className="path-list">
              {configPaths.map((p, idx) => (
                <div key={idx} className="path-item">
                  <span className="path-text">{p}</span>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemovePath(p)}
                    disabled={configPaths.length <= 1}
                    title="Remove this folder from search paths"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddPath} className="path-form">
              <input
                type="text"
                className="input-text"
                placeholder="Enter workspace-relative path (e.g. ./more-data) or absolute path"
                value={newPathInput}
                onChange={(e) => setNewPathInput(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary">
                + Add Path
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Main Sets Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Available Flashcard Sets ({cardSets.length})</h2>
        {cardSets.length > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={handleToggleSelectAll}>
            {selectedPaths.length === cardSets.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Create New Card */}
        <div className="set-card" onClick={onCreateNewSet} style={{ borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ fontSize: '3rem', color: 'var(--accent-primary)', marginBottom: '8px' }}>+</div>
          <div style={{ fontWeight: '600' }}>Create New Set</div>
        </div>

        {/* List of sets */}
        {cardSets.map(set => {
          const isSelected = selectedPaths.includes(set.filePath);
          return (
            <div 
              key={set.filePath} 
              className={`set-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleToggleSelect(set.filePath)}
            >
              <div className="card-checkbox" />
              
              <div className="set-info">
                <div className="set-title" title={set.name}>{set.name}</div>
                <div className="set-count">{set.cardCount} cards</div>
                <div className="set-path" title={set.filePath}>
                  Folder: {set.filePath.substring(0, set.filePath.lastIndexOf(set.filePath.includes('/') ? '/' : '\\'))}
                </div>
              </div>

              <div className="set-actions">
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => handleEditClick(e, set)}
                  title="Edit cards in this set"
                >
                  ✏️ Edit
                </button>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={(e) => handleDeleteClick(e, set)}
                  title="Delete this set"
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {cardSets.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          <h3>No Flashcard Sets Found</h3>
          <p style={{ marginTop: '8px', marginBottom: '20px' }}>
            Get started by creating your first set of flashcards!
          </p>
          <button className="btn btn-primary" onClick={onCreateNewSet}>
            Create New Set
          </button>
        </div>
      )}

      {/* Floating Sticky Bar */}
      {selectedPaths.length > 0 && (
        <div className="sticky-bar">
          <div>
            <div style={{ fontWeight: '600', fontSize: '1.05rem' }}>
              Ready to Study
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Selected {selectedPaths.length} set{selectedPaths.length > 1 ? 's' : ''} ({totalSelectedCards} cards total)
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => setSelectedPaths([])}>
              Clear Selection
            </button>
            <button className="btn btn-primary" onClick={handleStart} disabled={totalSelectedCards === 0}>
              Start Session (Shuffle) ⚡
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
