import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useExperiment } from '../context/ExperimentContext';
import './SetupPage.css';

export default function SetupPage() {
  const navigate = useNavigate();
  const {
    participantName,
    consentGiven,
    setUserId,
    setCategory,
    setUseCheatSheet,
    setImages,
  } = useExperiment();

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCheatSheet, setSelectedCheatSheet] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Guard: redirect if consent not given
  if (!consentGiven || !participantName) {
    navigate('/consent');
    return null;
  }

  async function handleStart() {
    setError('');
    if (!selectedCategory) {
      setError('Please select an image category.');
      return;
    }
    if (selectedCheatSheet === '') {
      setError('Please select your cheat sheet preference.');
      return;
    }

    const cheatSheetBool = selectedCheatSheet === 'yes';
    setLoading(true);

    try {
      // 1. Create participant session
      const sessionRes = await axios.post('/api/start-session', {
        name: participantName,
        category_selected: selectedCategory,
        cheat_sheet_used: cheatSheetBool ? 1 : 0,
      });
      const uid = sessionRes.data.userId;

      // 2. Fetch images for category (already randomized server-side)
      const imagesRes = await axios.get(`/api/images?category=${selectedCategory}`);
      const imgs = imagesRes.data.images;

      if (!imgs || imgs.length === 0) {
        setError('No images are available for this category. Please contact a supervisor.');
        setLoading(false);
        return;
      }

      // Persist to context
      setUserId(uid);
      setCategory(selectedCategory);
      setUseCheatSheet(cheatSheetBool);
      setImages(imgs);

      navigate('/experiment');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to start experiment. Please try again.';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div className="setup-card card">
        <div className="setup-header">
          <div className="setup-welcome">Welcome, <strong>{participantName}</strong></div>
          <h2>Experiment Setup</h2>
          <p className="muted">Please make your selections below. You cannot change these once the experiment begins.</p>
        </div>

        {/* ── IV1: Image Category ── */}
        <div className="setup-section">
          <h3 className="setup-section-title">
            <span className="setup-label-num">1</span>
            Image Category
          </h3>
          <p className="setup-hint muted">Select the type of images you will classify.</p>

          <div className="option-grid">
            <button
              className={`option-card ${selectedCategory === 'Landscape' ? 'selected' : ''}`}
              onClick={() => setSelectedCategory('Landscape')}
              type="button"
            >
              <span className="option-icon">🌄</span>
              <span className="option-title">Landscape</span>
              <span className="option-desc">Outdoor scenes and natural environments</span>
            </button>

            <button
              className={`option-card ${selectedCategory === 'People' ? 'selected' : ''}`}
              onClick={() => setSelectedCategory('People')}
              type="button"
            >
              <span className="option-icon">👤</span>
              <span className="option-title">People</span>
              <span className="option-desc">Portraits and human subjects</span>
            </button>
          </div>
        </div>

        {/* ── IV2: Cheat Sheet ── */}
        <div className="setup-section">
          <h3 className="setup-section-title">
            <span className="setup-label-num">2</span>
            Cheat Sheet Option
          </h3>
          <p className="setup-hint muted">
            A cheat sheet lists common visual artifacts found in AI-generated images.
            If you choose to use it, it will remain visible throughout the experiment.
          </p>

          <div className="option-grid">
            <button
              className={`option-card ${selectedCheatSheet === 'yes' ? 'selected' : ''}`}
              onClick={() => setSelectedCheatSheet('yes')}
              type="button"
            >
              <span className="option-icon">📋</span>
              <span className="option-title">Use Cheat Sheet</span>
              <span className="option-desc">Reference list visible during experiment</span>
            </button>

            <button
              className={`option-card ${selectedCheatSheet === 'no' ? 'selected' : ''}`}
              onClick={() => setSelectedCheatSheet('no')}
              type="button"
            >
              <span className="option-icon">🚫</span>
              <span className="option-title">No Cheat Sheet</span>
              <span className="option-desc">Classify images from memory alone</span>
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? 'Preparing experiment…' : 'Begin Experiment'}
        </button>
      </div>
    </div>
  );
}
