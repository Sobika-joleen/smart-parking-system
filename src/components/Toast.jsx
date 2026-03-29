import React, { useEffect, useState, useCallback } from "react";

const Toast = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onRemove }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const isSuccess = toast.type === "success";
  const isError = toast.type === "error";

  return (
    <div
      className={`
        pointer-events-auto max-w-sm w-80 rounded-2xl border px-4 py-3 shadow-2xl
        flex items-start gap-3 transition-all duration-300
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}
        ${isSuccess
          ? "bg-[#0d1a00] border-[#c6ff00]/30 shadow-[0_0_24px_rgba(198,255,0,0.15)]"
          : isError
          ? "bg-[#1a0000] border-red-500/30 shadow-[0_0_24px_rgba(239,68,68,0.15)]"
          : "bg-[#161616] border-white/10"
        }
      `}
    >
      {/* Icon */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
          isSuccess ? "bg-[#c6ff00]/15" : isError ? "bg-red-500/15" : "bg-white/10"
        }`}
      >
        {isSuccess ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="#c6ff00" strokeWidth="2.5" className="w-4 h-4">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : isError ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" className="w-4 h-4">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round"/>
            <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/>
            <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/>
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span
          className={`text-sm font-semibold ${
            isSuccess ? "text-[#c6ff00]" : isError ? "text-red-400" : "text-white"
          }`}
        >
          {toast.title}
        </span>
        {toast.message && (
          <span className="text-xs text-gray-400 leading-relaxed">{toast.message}</span>
        )}
      </div>

      {/* Close */}
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-gray-600 hover:text-gray-400 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
          <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
          <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
};

// Hook to manage toasts
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((title, message) => addToast({ type: "success", title, message }), [addToast]);
  const error = useCallback((title, message) => addToast({ type: "error", title, message }), [addToast]);
  const info = useCallback((title, message) => addToast({ type: "info", title, message }), [addToast]);

  return { toasts, removeToast, success, error, info };
};

export default Toast;
