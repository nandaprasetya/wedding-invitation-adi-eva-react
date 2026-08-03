import React, { useState } from 'react';
import { Copy, Send, UserPlus, Check } from 'lucide-react';
import '../styles/custom-name.css';

export default function CustomName() {
  const [name, setName] = useState('');
  const [submittedName, setSubmittedName] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  const getInvitationUrl = (recipientName) => {
    const encodedName = encodeURIComponent(recipientName).replace(/%20/g, '+');
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return `${origin}/adi-eva/?to=${encodedName}`;
    }
    return `https://anselmoments.com/adi-eva/?to=${encodedName}`;
  };

  const generateInvitationText = (recipientName) => {
    const link = getInvitationUrl(recipientName);
    return `               Kepada Yth.
*${recipientName}*

*OM SWASTYASTU*,
Atas asung kerta wara nugraha Ida Sang Hyang Widhi Wasa, tanpa mengurangi rasa hormat, karena keterbatasan jarak dan waktu, kami bermaksud mengundang Bapak/Ibu/Saudara/i dalam Upacara Manusa Yadnya Pawiwahan (Pernikahan).

Undangan dapat dilihat dengan mengklik link dibawah ini :
${link}

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
