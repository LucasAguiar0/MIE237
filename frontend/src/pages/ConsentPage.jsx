import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../context/ExperimentContext';
import './ConsentPage.css';

export default function ConsentPage() {
  const navigate = useNavigate();
  const { setParticipantName, setConsentGiven } = useExperiment();

  const [name, setName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name before proceeding.');
      return;
    }
    if (!accepted) {
      setError('You must accept the consent form to participate in the experiment.');
      return;
    }

    setParticipantName(name.trim());
    setConsentGiven(true);
    navigate('/setup');
  }

  return (
    <div className="page-center">
      <div className="consent-card card">
        <button className="btn btn-ghost btn-sm back-btn" onClick={() => navigate('/')}>
          ← Back
        </button>

        <h1>Participant Information &amp; Consent</h1>
        <p className="muted mt-1 mb-2">Please read carefully before proceeding.</p>

        <div className="consent-scroll">
          <h3>Study Purpose</h3>
          <p>
            This study investigates human ability to distinguish between
            AI-generated and authentic (non-AI) images. The results will be
            used for academic research purposes only.
          </p>

          <h3>Procedure</h3>
          <p>
            You will view a series of images, one at a time. For each image, you
            will indicate whether you believe it is AI-generated or not. Your
            response time will be recorded automatically from the moment the image
            appears until you click your answer. You will see ALL images in your
            selected category — there is no skipping.
          </p>

          <h3>Duration</h3>
          <p>The experiment takes approximately 10–15 minutes to complete.</p>

          <h3>Confidentiality</h3>
          <p>
            Your data will be stored securely and used only for academic analysis.
            Results may be reported in aggregate or anonymized form.
          </p>

          <h3>Voluntary Participation</h3>
          <p>
            Participation is voluntary. You may withdraw at any time before
            submitting your final response. Once the experiment is completed,
            your data cannot be removed.
          </p>

          <h3>No Feedback</h3>
          <p>
            You will NOT receive correctness feedback during or after the
            experiment. This is by experimental design.
          </p>

          <h3>Contact</h3>
          <p>
            If you have questions, please contact the research supervisor.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="consent-form">
          <div className="form-group">
            <label htmlFor="name">Your Full Name *</label>
            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <label className="consent-checkbox">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              I have read and understood the information above. I voluntarily
              consent to participate in this study.
            </span>
          </label>

          {error && <div className="alert alert-error mt-2">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-lg mt-3"
            style={{ width: '100%' }}
          >
            Proceed to Experiment Setup
          </button>
        </form>
      </div>
    </div>
  );
}
