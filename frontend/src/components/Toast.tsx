import React, { useEffect, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { subscribe, ToastItem } from '@/lib/toast';

const colorByType: Record<ToastItem['type'], string> = {
  success: 'bg-emerald-600',
  error: 'bg-rose-600',
  info: 'bg-sky-600',
  warning: 'bg-amber-600',
};

const IconByType: Record<ToastItem['type'], React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

export const ToastHost: React.FC = () => {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsub = subscribe((t) => {
      setItems((prev) => {
        // Prevent duplicate messages
        if (prev.some(i => i.message === t.message)) {
          return prev;
        }
        return [...prev, t];
      });
      setTimeout(() => dismiss(t.id), t.duration || 3000);
    });
    // React cleanup: void döner
    return () => { unsub(); };
  }, []);

  const dismiss = (id: number) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {items.map((t) => {
        const Icon = IconByType[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto text-white shadow-md rounded-md px-3 py-2.5 flex items-center gap-2.5 ${colorByType[t.type]} animate-in slide-in-from-right-5 fade-in duration-300`}
          >
            <Icon className="flex-shrink-0" style={{ width: '1em', height: '1em' }} />
            <div className="text-xs font-medium leading-normal">{t.message}</div>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Kapat"
              title="Kapat"
            >
              <X style={{ width: '0.875em', height: '0.875em' }} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
