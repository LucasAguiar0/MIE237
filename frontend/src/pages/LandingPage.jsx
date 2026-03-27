import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../context/ExperimentContext';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const { reset } = useExperiment();

  function handleStart() {
    reset();
    navigate('/consent');
  }

  return (
    <div className="landing-page">
      <div className="landing-card">
        <div className="landing-badge">MIE237 Research Study</div>
        <h1 className="landing-title">AI Image Perception Experiment</h1>
        <p className="landing-subtitle">
          Can you tell the difference between AI-generated and real images?
        </p>

        <div className="landing-description">
          <p>
            This study investigates human ability to distinguish between
            AI-generated and non-AI-generated images across different categories.
            Your participation will contribute to academic research in human
            perception and AI literacy.
          </p>
          <ul className="landing-info-list">
            <li>Duration: approximately 10–15 minutes</li>
            <li>You will view a series of images one at a time</li>
            <li>For each image, classify it as AI-generated or not</li>
            <li>Your reaction time will be recorded</li>
            <li>No correctness feedback will be shown during the experiment</li>
          </ul>
        </div>

        <div className="landing-actions">
          <button className="btn btn-primary btn-xl" onClick={handleStart}>
            Start Experiment
          </button>
        </div>

        <div className="landing-admin-link">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/admin/login')}
          >
            Supervisor Login
          </button>
        </div>
      </div>
    </div>
  );
}
