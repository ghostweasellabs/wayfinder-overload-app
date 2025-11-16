import { useState, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const Toast = toast ? (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border ${
      toast.type === 'error' 
        ? 'bg-destructive text-destructive-foreground border-destructive' 
        : toast.type === 'success'
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-card text-card-foreground border-border'
    }`}>
      <div className="flex items-center gap-2">
        <span>{toast.message}</span>
        <button
          onClick={() => setToast(null)}
          className="ml-2 text-current opacity-70 hover:opacity-100"
        >
          ×
        </button>
      </div>
    </div>
  ) : null;

  return { showToast, Toast };
}

