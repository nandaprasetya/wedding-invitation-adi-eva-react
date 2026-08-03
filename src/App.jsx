import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdiEvaInvitation from './pages/AdiEvaInvitation';
import CustomName from './pages/CustomName';

function FallbackRedirect() {
  const location = useLocation();
  return <Navigate to={`/adi-eva${location.search}`} replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdiEvaInvitation />} />
        <Route path="/adi-eva" element={<AdiEvaInvitation />} />
        <Route path="/custom-name" element={<CustomName />} />
        <Route path="*" element={<FallbackRedirect />} />
      </Routes>
    </Router>
  );
}
