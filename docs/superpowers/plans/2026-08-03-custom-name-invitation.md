# Custom Name Invitation Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a custom name invitation text generator page at `/custom-name` where users enter a guest's name to output formatted invitation copy with WhatsApp share & copy capabilities.

**Architecture:** Create `src/pages/CustomName.jsx` component and `src/styles/custom-name.css` stylesheet, register route `/custom-name` in `src/App.jsx`.

**Tech Stack:** React 18, React Router v6, Lucide React (for icons), Vanilla CSS.

## Global Constraints

- Must match layout structure in user screenshots (Bagikan Undangan & Detail Undangan).
- Formatted WhatsApp text must contain asterisks `*` for bolding (`*Nanda*`, `*OM SWASTYASTU*`).
- Invitation link inside copy must be `https://anselmoments.com/adi-eva/?to={encodeURIComponent(nama)}`.

---

### Task 1: Create CustomName stylesheet and component

**Files:**
- Create: `src/styles/custom-name.css`
- Create: `src/pages/CustomName.jsx`

**Interfaces:**
- Consumes: React hooks (`useState`), `lucide-react` icons (`Copy`, `Send`, `UserPlus`, `Check`).
- Produces: `CustomName` React page component.

- [ ] **Step 1: Create CSS styling file `src/styles/custom-name.css`**

```css
.custom-name-container {
  max-width: 768px;
  margin: 40px auto;
  padding: 0 16px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.custom-name-card {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
  margin-bottom: 24px;
  overflow: hidden;
}

.custom-name-card-header {
  padding: 16px 20px;
  font-size: 1.25rem;
  font-weight: 500;
  color: #2d3748;
  border-bottom: 1px solid #edf2f7;
}

.custom-name-card-body {
  padding: 20px;
}

.input-group {
  display: flex;
  margin-bottom: 16px;
}

.input-group-text {
  background-color: #f7fafc;
  border: 1px solid #cbd5e0;
  border-right: none;
  border-radius: 6px 0 0 6px;
  padding: 10px 16px;
  color: #4a5568;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.input-group-input {
  flex: 1;
  border: 1px solid #cbd5e0;
  border-radius: 0 6px 6px 0;
  padding: 10px 14px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.input-group-input:focus {
  border-color: #3182ce;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.2);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.btn:active {
  transform: translateY(1px);
}

.btn-primary {
  background-color: #48bb78;
  color: white;
}

.btn-primary:hover {
  background-color: #38a169;
}

.btn-secondary {
  background-color: #edf2f7;
  color: #2d3748;
  border: 1px solid #cbd5e0;
}

.btn-secondary:hover {
  background-color: #e2e8f0;
}

.btn-danger {
  background-color: #e53e3e;
  color: white;
}

.btn-danger:hover {
  background-color: #c53030;
}

.detail-actions-top {
  margin-bottom: 12px;
}

.invitation-textarea {
  width: 100%;
  min-height: 240px;
  padding: 14px;
  font-size: 0.95rem;
  line-height: 1.6;
  color: #2d3748;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  background-color: #fff;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
}

.detail-actions-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.copy-toast {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 12px;
  color: #38a169;
  font-weight: 500;
  font-size: 0.9rem;
}
```

- [ ] **Step 2: Create React Page Component `src/pages/CustomName.jsx`**

```jsx
import React, { useState } from 'react';
import { Copy, Send, UserPlus, Check } from 'lucide-react';
import '../styles/custom-name.css';

export default function CustomName() {
  const [name, setName] = useState('');
  const [submittedName, setSubmittedName] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateInvitationText = (recipientName) => {
    return `               Kepada Yth.
*${recipientName}*

*OM SWASTYASTU*,
Atas asung kerta wara nugraha Ida Sang Hyang Widhi Wasa, tanpa mengurangi rasa hormat, karena keterbatasan jarak dan waktu, kami bermaksud mengundang Bapak/Ibu/Saudara/i dalam Upacara Manusa Yadnya Pawiwahan (Pernikahan).

Undangan dapat dilihat dengan mengklik link dibawah ini :
https://anselmoments.com/adi-eva/?to=${encodeURIComponent(recipientName)}

Suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i dan teman-teman dapat hadir pada acara kami dan memberikan doa restu.🙏

Terima kasih.
OM SHANTI, SHANTI, SHANTI OM`;
  };

  const handleLanjutkan = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmittedName(name.trim());
    setShowDetail(true);
  };

  const handleCopy = () => {
    const text = generateInvitationText(submittedName);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsapp = () => {
    const text = generateInvitationText(submittedName);
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleReset = () => {
    setName('');
    setSubmittedName('');
    setShowDetail(false);
    setCopied(false);
  };

  return (
    <div className="custom-name-container">
      {/* Form Section */}
      <div className="custom-name-card">
        <div className="custom-name-card-header">Bagikan Undangan</div>
        <div className="custom-name-card-body">
          <form onSubmit={handleLanjutkan}>
            <div className="input-group">
              <span className="input-group-text">Nama Tujuan</span>
              <input
                type="text"
                className="input-group-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama tujuan..."
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Lanjutkan
            </button>
          </form>
        </div>
      </div>

      {/* Detail Section */}
      {showDetail && (
        <div className="custom-name-card">
          <div className="custom-name-card-header">Detail Undangan</div>
          <div className="custom-name-card-body">
            <div className="detail-actions-top">
              <button type="button" className="btn btn-secondary" onClick={handleCopy}>
                <Copy size={16} />
                Copy Data
              </button>
              {copied && (
                <span className="copy-toast">
                  <Check size={16} /> Berhasil dicopy!
                </span>
              )}
            </div>

            <textarea
              className="invitation-textarea"
              value={generateInvitationText(submittedName)}
              readOnly
            />

            <div className="detail-actions-bottom">
              <button type="button" className="btn btn-primary" onClick={handleSendWhatsapp}>
                <Send size={18} /> Kirim Whatsapp
              </button>

              <button type="button" className="btn btn-danger" onClick={handleReset}>
                <UserPlus size={18} /> Tujuan Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### Task 2: Register `/custom-name` Route in App.jsx

**Files:**
- Modify: `src/App.jsx:1-21`

- [ ] **Step 1: Import CustomName and add Route `/custom-name`**

Update `src/App.jsx` to include `/custom-name`:

```jsx
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
```
