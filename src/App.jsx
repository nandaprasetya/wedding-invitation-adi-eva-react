import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdiEvaInvitation from './pages/AdiEvaInvitation';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/adi-eva" element={<AdiEvaInvitation />} />
        <Route path="*" element={<Navigate to="/adi-eva" replace />} />
      </Routes>
    </Router>
  );
}
