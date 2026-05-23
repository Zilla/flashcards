import React, { useState, useEffect } from 'react';
import Card from './Card';

export default function CardEditor({ editingSet, onSave, onCancel }) {
  const [setName, setSetName] = useState('');
  const [cards, setCards] = useState([]);
  const [configPaths, setConfigPaths] = useState([]);
  const [selectedDirectory, setSelectedDirectory] = useState('');
  const [customDirectory, setCustomDirectory] = useState('');
  const [showCustomDirInput, setShowCustomDirInput] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pendingUploads, setPendingUploads] = useState({});
  const [previewIndex, setPreviewIndex] = useState(null);
  const [previewFlipped, setPreviewFlipped] = useState(false);

  const insertAtCursor = (elementId, textToInsert) => {
    const el = document.getElementById(elementId);
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newValue = before + textToInsert + after;
    
    const isFront = elementId.startsWith('front-input-');
    const index = parseInt(elementId.replace('front-input-', '').replace('back-input-', ''));
    const field = isFront ? 'front' : 'back';
    
    handleCardChange(index, field, newValue);

    setTimeout(() => {
      el.focus();
      const newCursorPos = start + textToInsert.length;
      el.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const handleImageUpload = (file, elementId) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Only image files are supported.');
      return;
    }

    const blobUrl = URL.createObjectURL(file);

    setPendingUploads(prev => ({
      ...prev,
      [blobUrl]: file
    }));

    const markdownTag = `\n![${file.name}](${blobUrl})\n`;
    insertAtCursor(elementId, markdownTag);
  };

  const handleDrop = (e, elementId) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file, elementId);
    }
  };

  const handlePaste = (e, elementId) => {
    const file = e.clipboardData.files[0];
    if (file) {
      e.preventDefault();
      handleImageUpload(file, elementId);
    }
  };

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

      // 1. Initial Save to get set ID and path
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

      let savedSet = await response.json();
      const finalFilePath = savedSet.filePath;

      // 2. Upload pending image assets if any are present in the card contents
      const activePendingKeys = Object.keys(pendingUploads).filter(blobUrl => 
        cards.some(c => c.front.includes(blobUrl) || c.back.includes(blobUrl))
      );

      if (activePendingKeys.length > 0) {
        const updatedCards = [...cards];
        
        for (const blobUrl of activePendingKeys) {
          const file = pendingUploads[blobUrl];
          const arrayBuffer = await file.arrayBuffer();
          
          const uploadResponse = await fetch('/api/sets/assets', {
            method: 'POST',
            headers: {
              'Content-Type': file.type,
              'x-set-path': finalFilePath,
              'x-file-name': file.name
            },
            body: arrayBuffer
          });

          if (!uploadResponse.ok) {
            const errData = await uploadResponse.json();
            throw new Error(errData.error || `Failed to upload image ${file.name}`);
          }

          const { url: serverUrl } = await uploadResponse.json();

          // Replace the local Blob URLs with the server URLs in all cards
          for (let i = 0; i < updatedCards.length; i++) {
            updatedCards[i] = {
              ...updatedCards[i],
              front: updatedCards[i].front.replaceAll(blobUrl, serverUrl),
              back: updatedCards[i].back.replaceAll(blobUrl, serverUrl)
            };
          }
        }

        // 3. Save the card set again with finalized server asset URLs
        const finalizePayload = {
          filePath: finalFilePath,
          name: setName.trim(),
          cards: updatedCards.map(c => ({
            front: c.front.trim(),
            back: c.back.trim()
          }))
        };

        const finalizeResponse = await fetch('/api/sets', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(finalizePayload)
        });

        if (!finalizeResponse.ok) {
          const errData = await finalizeResponse.json();
          throw new Error(errData.error || 'Failed to finalize card set with server image links.');
        }

        savedSet = await finalizeResponse.json();
      }

      // Cleanup local Blob URLs
      activePendingKeys.forEach(blobUrl => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch (revErr) {
          console.error('Error revoking Object URL:', revErr);
        }
      });
      setPendingUploads({});

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
              <div key={idx} className="editor-card-row" style={{ flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '16px', width: '100%', alignItems: 'flex-start' }}>
                  <span className="card-index-tag" style={{ alignSelf: 'flex-start', marginTop: '12px' }}>#{idx + 1}</span>
                  
                  <div className="editor-inputs">
                    {/* Front input container */}
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <textarea
                        id={`front-input-${idx}`}
                        className="textarea-input"
                        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: 'none', margin: 0, minHeight: '90px' }}
                        placeholder="Front side (Prompt / Question)"
                        value={card.front}
                        onChange={(e) => handleCardChange(idx, 'front', e.target.value)}
                        onDrop={(e) => handleDrop(e, `front-input-${idx}`)}
                        onDragOver={(e) => e.preventDefault()}
                        onPaste={(e) => handlePaste(e, `front-input-${idx}`)}
                        disabled={isSaving}
                        required
                      />
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--glass-border)',
                        borderBottomLeftRadius: 'var(--radius-sm)',
                        borderBottomRightRadius: 'var(--radius-sm)',
                      }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Drag/drop or paste image
                        </span>
                        <label
                          htmlFor={`file-input-front-${idx}`}
                          style={{
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            color: 'var(--accent-secondary)',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            userSelect: 'none'
                          }}
                          title="Upload Image"
                        >
                          📷 Upload
                        </label>
                        <input
                          id={`file-input-front-${idx}`}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(file, `front-input-${idx}`);
                            }
                            e.target.value = '';
                          }}
                        />
                      </div>
                    </div>

                    {/* Back input container */}
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <textarea
                        id={`back-input-${idx}`}
                        className="textarea-input"
                        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: 'none', margin: 0, minHeight: '90px' }}
                        placeholder="Back side (Answer / Explanation)"
                        value={card.back}
                        onChange={(e) => handleCardChange(idx, 'back', e.target.value)}
                        onDrop={(e) => handleDrop(e, `back-input-${idx}`)}
                        onDragOver={(e) => e.preventDefault()}
                        onPaste={(e) => handlePaste(e, `back-input-${idx}`)}
                        disabled={isSaving}
                        required
                      />
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--glass-border)',
                        borderBottomLeftRadius: 'var(--radius-sm)',
                        borderBottomRightRadius: 'var(--radius-sm)',
                      }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Drag/drop or paste image
                        </span>
                        <label
                          htmlFor={`file-input-back-${idx}`}
                          style={{
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            color: 'var(--accent-secondary)',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            userSelect: 'none'
                          }}
                          title="Upload Image"
                        >
                          📷 Upload
                        </label>
                        <input
                          id={`file-input-back-${idx}`}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(file, `back-input-${idx}`);
                            }
                            e.target.value = '';
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignSelf: 'stretch', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${previewIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => {
                        if (previewIndex === idx) {
                          setPreviewIndex(null);
                        } else {
                          setPreviewIndex(idx);
                          setPreviewFlipped(false);
                        }
                      }}
                      disabled={isSaving}
                      title="Toggle live preview"
                      style={{ minWidth: '40px', padding: '8px 4px' }}
                    >
                      👁️
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemoveCard(idx)}
                      disabled={isSaving || cards.length === 1}
                      style={{ minWidth: '40px', padding: '8px 4px' }}
                      title="Remove card"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Inline Preview Container */}
                {previewIndex === idx && (
                  <div style={{ 
                    width: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    marginTop: '20px', 
                    padding: '20px', 
                    backgroundColor: 'rgba(0, 0, 0, 0.25)', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--glass-border)',
                    animation: 'fadeIn 0.25s ease-out'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '16px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Live Card Preview (Click Card to Flip)
                      </span>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={() => setPreviewIndex(null)}
                        style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                      >
                        Close Preview
                      </button>
                    </div>
                    <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
                      <Card 
                        front={card.front} 
                        back={card.back} 
                        isFlipped={previewFlipped} 
                        onFlip={() => setPreviewFlipped(!previewFlipped)} 
                      />
                    </div>
                  </div>
                )}
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
