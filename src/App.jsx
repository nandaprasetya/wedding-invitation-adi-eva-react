import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdiEvaInvitation from './pages/AdiEvaInvitation';
import CustomName from './pages/CustomName';

const OrderPage = lazy(() => import('./pages/OrderPage'));
const OrderStatusPage = lazy(() => import('./pages/OrderStatusPage'));

function FallbackRedirect() {
  const location = useLocation();
  return <Navigate to={`/adi-eva${location.search}`} replace />;
}

function OrderRouteFallback() {
  return (
    <div className="min-h-screen bg-goldSand-50 flex items-center justify-center font-dm text-sm text-codGray-500">
      Memuat halaman...
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Suspense fallback={<OrderRouteFallback />}>
        <Routes>
          <Route path="/" element={<AdiEvaInvitation />} />
          <Route path="/adi-eva" element={<AdiEvaInvitation />} />
          <Route path="/adi-eva/custom-name" element={<CustomName />} />
          <Route path="/custom-name" element={<CustomName />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/order/:orderCode" element={<OrderStatusPage />} />
          <Route path="*" element={<FallbackRedirect />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
