import React, { createContext, useContext, useState } from 'react';

const ExperimentContext = createContext(null);

export function ExperimentProvider({ children }) {
  // Participant session info
  const [participantName, setParticipantName] = useState('');
  const [userId, setUserId] = useState(null);
  const [category, setCategory] = useState('');       // 'People' | 'Landscape'
  const [useCheatSheet, setUseCheatSheet] = useState(false);

  // Experiment runtime
  const [images, setImages] = useState([]);           // shuffled image list
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState([]);     // local copy for summary

  // Consent
  const [consentGiven, setConsentGiven] = useState(false);

  function reset() {
    setParticipantName('');
    setUserId(null);
    setCategory('');
    setUseCheatSheet(false);
    setImages([]);
    setCurrentIndex(0);
    setResponses([]);
    setConsentGiven(false);
  }

  return (
    <ExperimentContext.Provider value={{
      participantName, setParticipantName,
      userId, setUserId,
      category, setCategory,
      useCheatSheet, setUseCheatSheet,
      images, setImages,
      currentIndex, setCurrentIndex,
      responses, setResponses,
      consentGiven, setConsentGiven,
      reset,
    }}>
      {children}
    </ExperimentContext.Provider>
  );
}

export function useExperiment() {
  const ctx = useContext(ExperimentContext);
  if (!ctx) throw new Error('useExperiment must be used inside <ExperimentProvider>');
  return ctx;
}
