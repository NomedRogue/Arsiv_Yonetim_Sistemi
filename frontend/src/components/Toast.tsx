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
            className={`pointer-events-auto text-white shadow-md rounded-md px-3 py-2 xl:px-4 xl:py-3 flex items-center gap-2.5 ${colorByType[t.type]} animate-in slide-in-from-right-5 fade-in duration-300`}
          >
            <Icon className="flex-shrink-0 w-4 h-4 xl:w-5 xl:h-5" />
            <div className="text-xs xl:text-sm font-medium leading-normal">{t.message}</div>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Kapat"
              title="Kapat"
            >
              <X className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
