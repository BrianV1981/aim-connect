import React, { useState, useEffect } from 'react';

export default function IntegrationsModal({ isOpen, onClose, activeSession }) {
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (isOpen && activeSession) {
      // Fetch current integration settings
      fetch(`/api/integrations/${activeSession}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setEmail(data.gmail_address || '');
            setHasPassword(data.has_password || false);
            setAppPassword(''); // Never load password into state
          }
        })
        .catch(err => console.error(err));
    }
  }, [isOpen, activeSession]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/integrations/${activeSession}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gmail_address: email,
          gmail_app_password: appPassword
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setStatus('Credentials saved securely to agent vault.');
        if (appPassword) setHasPassword(true);
        setAppPassword(''); // Clear from state for security
        setTimeout(() => setStatus(''), 3000);
      } else {
        setStatus('Error saving credentials.');
      }
    } catch (e) {
      console.error(e);
      setStatus('Network error.');
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px'
    }}>
      <div className="modal-content" style={{
        background: '#161e1a', padding: '30px', borderRadius: '12px',
        maxWidth: '500px', width: '100%', border: '1px solid #00ff88',
        boxShadow: '0 0 20px rgba(0, 255, 136, 0.2)', color: '#e0f2e9',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <h2 style={{ color: '#00ff88', marginTop: 0, borderBottom: '1px solid #00ff88', paddingBottom: '10px' }}>
          🔌 Integrations Vault
        </h2>
        
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '0.9rem', color: '#a0c4ff' }}>
            <strong>Email Outbound Architecture (Zero OAuth)</strong><br />
            Provide a Google App Password to enable your agent to natively send emails and calendar invites directly from your Gmail account without requiring strict Google Cloud OAuth verification.
          </p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Gmail Address</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. joshua@yourdomain.com"
            style={{
              width: '100%', padding: '10px', borderRadius: '4px',
              border: '1px solid #333', background: '#0a0f0c', color: '#fff'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Google App Password {hasPassword && <span style={{ color: '#00ff88', fontSize: '0.8rem' }}>(✓ Vaulted)</span>}
          </label>
          <input 
            type="password" 
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            placeholder={hasPassword ? "•••••••••••••••• (Leave blank to keep existing)" : "16-character app password"}
            style={{
              width: '100%', padding: '10px', borderRadius: '4px',
              border: '1px solid #333', background: '#0a0f0c', color: '#fff'
            }}
          />
        </div>

        {status && (
          <div style={{ marginBottom: '20px', padding: '10px', background: 'rgba(0, 255, 136, 0.1)', color: '#00ff88', borderRadius: '4px' }}>
            {status}
          </div>
        )}

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '10px 20px', background: '#333', color: '#fff',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            Close
          </button>
          
          <button 
            onClick={handleSave}
            style={{
              padding: '10px 20px', background: '#00ff88', color: '#000',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            Save Credentials
          </button>
        </div>
      </div>
    </div>
  );
}
