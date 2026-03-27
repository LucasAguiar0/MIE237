import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../context/ExperimentContext';
import './CompletionPage.css';

export default function CompletionPage() {
  const navigate = useNavigate();
  const { participantName, category, useCheatSheet, responses, reset } = useExperiment();

  // Guard: if someone navigates here directly
  if (!participantName) {
    navigate('/');
    return null;
  }

  function handleDone() {
    reset();
    navigate('/');
  }

  return (
    <div className="page-center">
      <div className="completion-card card">
        <div className="completion-icon">✓</div>
        <h1>Experiment Complete!</h1>
        <p className="muted mt-1">
          Thank you for participating, <strong>{participantName}</strong>.
        </p>

        <div className="completion-summary">
          <div className="summary-row">
            <span>Images classified</span>
            <strong>{responses.length}</strong>
          </div>
          <div className="summary-row">
            <span>Category</span>
            <strong>{category}</strong>
          </div>
          <div className="summary-row">
            <span>Cheat sheet used</span>
            <strong>{useCheatSheet ? 'Yes' : 'No'}</strong>
          </div>
        </div>

        <div className="alert alert-info mt-2">
          Your responses have been saved. Results and accuracy will not be
          disclosed to preserve experimental integrity.
        </div>

        <p className="muted" style={{ fontSize: '.9rem', marginTop: 16 }}>
          Please inform the supervisor that you have completed the experiment.
        </p>

        <button className="btn btn-primary btn-lg mt-3" onClick={handleDone}>
          Return to Home
        </button>
      </div>
    </div>
  );
}
