import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useExperiment } from '../context/ExperimentContext';
import CheatSheet from '../components/CheatSheet';
import './ExperimentPage.css';

export default function ExperimentPage() {
  const navigate = useNavigate();
  const {
    userId,
    images,
    currentIndex,
    setCurrentIndex,
    useCheatSheet,
    setResponses,
    responses,
    category,
  } = useExperiment();

  const [imageLoaded, setImageLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Timer: started when image becomes visible
  const timerStartRef = useRef(null);

  // Guard: redirect if no session
  useEffect(() => {
    if (!userId || !images || images.length === 0) {
      navigate('/');
    }
  }, [userId, images, navigate]);

  const currentImage = images[currentIndex];
  const total = images.length;
  const progress = ((currentIndex) / total) * 100;

  // Start timer whenever image changes and is loaded
  useEffect(() => {
    setImageLoaded(false);
    timerStartRef.current = null;
  }, [currentIndex]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    timerStartRef.current = performance.now();
  }, []);

  async function handleClassify(classification) {
    if (submitting || !imageLoaded) return;
    setError('');

    const reactionTime = timerStartRef.current
      ? Math.round(performance.now() - timerStartRef.current)
      : 0;

    setSubmitting(true);

    try {
      await axios.post('/api/submit-response', {
        userId,
        imageId: currentImage.id,
        participant_classification: classification,
        reaction_time: reactionTime,
      });

      // Record locally for completion summary (without revealing correctness)
      setResponses([...responses, {
        imageId: currentImage.id,
        imageName: currentImage.name,
        classification,
        reactionTime,
      }]);

      const nextIndex = currentIndex + 1;

      if (nextIndex >= total) {
        // Mark experiment complete
        await axios.post('/api/complete-experiment', { userId });
        navigate('/done');
      } else {
        setCurrentIndex(nextIndex);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to record response. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!currentImage) return null;

  return (
    <div className="experiment-layout">
      {/* ── Cheat Sheet (fixed panel, only if opted in) ── */}
      {useCheatSheet && <CheatSheet />}

      <div className="experiment-main">
        {/* ── Header / Progress ── */}
        <header className="experiment-header">
          <div className="experiment-meta">
            <span className="badge badge-blue">{category}</span>
            {useCheatSheet && <span className="badge badge-yellow">Cheat Sheet Active</span>}
          </div>
          <div className="experiment-progress-info">
            Image {currentIndex + 1} of {total}
          </div>
        </header>

        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* ── Image area ── */}
        <div className="image-container">
          {!imageLoaded && (
            <div className="image-loading">
              <div className="spinner" />
              <span className="muted">Loading image…</span>
            </div>
          )}
          <img
            key={currentImage.id}
            src={currentImage.file_path}
            alt="Classify this image"
            className={`experiment-image ${imageLoaded ? 'visible' : 'hidden'}`}
            onLoad={handleImageLoad}
            draggable={false}
          />
        </div>

        {/* ── Instruction ── */}
        <p className="classify-instruction">
          Is this image AI-generated or not?
        </p>

        {/* ── Classification buttons ── */}
        <div className="classify-buttons">
          <button
            className="classify-btn classify-btn-ai"
            onClick={() => handleClassify(1)}
            disabled={submitting || !imageLoaded}
          >
            <span className="classify-btn-icon">🤖</span>
            <span className="classify-btn-label">AI-Generated</span>
          </button>

          <button
            className="classify-btn classify-btn-real"
            onClick={() => handleClassify(0)}
            disabled={submitting || !imageLoaded}
          >
            <span className="classify-btn-icon">📷</span>
            <span className="classify-btn-label">Not AI-Generated</span>
          </button>
        </div>

        {submitting && (
          <div className="experiment-saving muted">Saving response…</div>
        )}

        {error && (
          <div className="alert alert-error" style={{ maxWidth: 500, margin: '12px auto 0' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
