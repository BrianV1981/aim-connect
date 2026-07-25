import React, { useState } from 'react';

export default function DeleteSessionModal({ isOpen, onClose, onConfirm, sessionName }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#1a1a1a',
        padding: '30px',
        borderRadius: '12px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 0 30px rgba(255, 0, 0, 0.4)',
        border: '2px solid #ff4444',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <h2 style={{ color: '#ff4444', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          ⚠️ DESTRUCTIVE ACTION
        </h2>
        
        <p style={{ fontSize: '1.1rem', lineHeight: '1.5' }}>
          You are about to kill the session: <strong>{sessionName}</strong>
        </p>
        
        <div style={{
          background: 'rgba(255, 68, 68, 0.1)',
          padding: '15px',
          borderRadius: '8px',
          borderLeft: '4px solid #ff4444',
          margin: '20px 0'
        }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#ff6b6b' }}>This action will permanently terminate:</p>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#ffb3b3' }}>
            <li style={{ marginBottom: '8px' }}>The active agent process and tmux session</li>
          </ul>
          <p style={{ margin: '15px 0 0 0', fontWeight: 'bold', color: '#5cb85c', fontSize: '0.9rem' }}>
            (Note: The workspace directory and all generated artifacts will be safely preserved.)
          </p>
        </div>
        
        <p style={{ color: '#ccc', marginBottom: '25px', fontWeight: 'bold' }}>
          This action will end the current session. Are you sure?
        </p>
        
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Cancel
          </button>
          
          <button 
            onClick={() => onConfirm(sessionName)}
            style={{
              padding: '10px 20px',
              background: '#ff4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            🗑️ Yes, End Session
          </button>
        </div>
      </div>
    </div>
  );
}
