import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import InvitationPage from './pages/InvitationPage';
import CustomName from './pages/CustomName';

const OrderPage = lazy(() => import('./pages/OrderPage'));
const OrderStatusPage = lazy(() => import('./pages/OrderStatusPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function FallbackRedirect() {
  const location = useLocation();
  return <Navigate to={`/adi-eva${location.search}`} replace />;
}

function RouteFallback() {
  return (
    <div className="min-h-screen bg-goldSand-50 flex items-center justify-center font-dm text-sm text-codGray-500">
      Memuat halaman...
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<InvitationPage defaultSlug="adi-eva" />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/order/:orderCode" element={<OrderStatusPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
          <Route path="/custom-name" element={<CustomName />} />
          <Route path="/:slug/custom-name" element={<CustomName />} />
          <Route path="/:slug" element={<InvitationPage />} />
          <Route path="*" element={<FallbackRedirect />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
