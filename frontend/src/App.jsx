import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ExperimentProvider } from './context/ExperimentContext';

import LandingPage      from './pages/LandingPage';
import ConsentPage      from './pages/ConsentPage';
import SetupPage        from './pages/SetupPage';
import ExperimentPage   from './pages/ExperimentPage';
import CompletionPage   from './pages/CompletionPage';
import AdminLogin       from './pages/AdminLogin';
import AdminDashboard   from './pages/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <ExperimentProvider>
        <Routes>
          <Route path="/"             element={<LandingPage />} />
          <Route path="/consent"      element={<ConsentPage />} />
          <Route path="/setup"        element={<SetupPage />} />
          <Route path="/experiment"   element={<ExperimentPage />} />
          <Route path="/done"         element={<CompletionPage />} />
          <Route path="/admin/login"  element={<AdminLogin />} />
          <Route path="/admin/*"      element={<AdminDashboard />} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </ExperimentProvider>
    </BrowserRouter>
  );
}
