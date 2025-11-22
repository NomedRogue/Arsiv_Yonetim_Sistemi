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
      setItems((prev) => [...prev, t]);
      setTimeout(() => dismiss(t.id), 3000);
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
            className={`pointer-events-auto text-white shadow-lg rounded-lg px-4 py-3 flex items-start gap-3 ${colorByType[t.type]}`}
          >
            <Icon className="mt-[0.125rem]" style={{ width: '1.125em', height: '1.125em' }} />
            <div className="text-sm">{t.message}</div>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-2 opacity-80 hover:opacity-100 transition"
              aria-label="Kapat"
              title="Kapat"
            >
              <X style={{ width: '1em', height: '1em' }} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
