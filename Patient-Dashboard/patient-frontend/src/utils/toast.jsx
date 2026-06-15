import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// ── Toast types ────────────────────────────────────────────
const ICONS = {
  success: (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
};

// ── Global singleton emitter ───────────────────────────────
let _emit = null;
export const setToastEmitter = (fn) => { _emit = fn; };

export const toast = {
  success: (msg) => _emit?.({ type: 'success', msg }),
  error:   (msg) => _emit?.({ type: 'error',   msg }),
  warning: (msg) => _emit?.({ type: 'warning', msg }),
  info:    (msg) => _emit?.({ type: 'info',    msg }),
};

// ── ToastContainer — mount once in App root ────────────────
let idCounter = 0;

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const add = useCallback(({ type, msg }) => {
    const id = ++idCounter;
    setToasts(prev => [...prev, { id, type, msg, exiting: false }]);
    setTimeout(() => dismiss(id), 4000);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
  }, []);

  useEffect(() => {
    setToastEmitter(add);
    return () => setToastEmitter(null);
  }, [add]);

  return createPortal(
    <div className="cp-toast-stack" aria-live="polite">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`cp-toast cp-toast--${t.type} ${t.exiting ? 'cp-toast--exit' : 'cp-toast--enter'}`}
          role="alert"
        >
          <span className={`cp-toast__icon cp-toast__icon--${t.type}`}>{ICONS[t.type]}</span>
          <span className="cp-toast__msg">{t.msg}</span>
          <button className="cp-toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
