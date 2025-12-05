import React, { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  confirmText?: string;
  confirmColor?: string;
  closeOnBackdrop?: boolean;
  type?: 'default' | 'warning' | 'danger' | 'success' | 'info';
  showIcon?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = 'Onayla',
  confirmColor,
  closeOnBackdrop = true,
  type = 'default',
  showIcon = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Tip bazında renk ve ikon ayarları
  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          iconColor: 'text-amber-600 dark:text-amber-400',
          icon: AlertTriangle,
          headerBg: 'bg-amber-50 dark:bg-amber-900/20',
          confirmButton: confirmColor || 'bg-amber-600 hover:bg-amber-700',
        };
      case 'danger':
        return {
          iconColor: 'text-red-600 dark:text-red-400',
          icon: AlertTriangle,
          headerBg: 'bg-red-50 dark:bg-red-900/20',
          confirmButton: confirmColor || 'bg-red-600 hover:bg-red-700',
        };
      case 'success':
        return {
          iconColor: 'text-green-600 dark:text-green-400',
          icon: CheckCircle,
          headerBg: 'bg-green-50 dark:bg-green-900/20',
          confirmButton: confirmColor || 'bg-green-600 hover:bg-green-700',
        };
      case 'info':
        return {
          iconColor: 'text-blue-600 dark:text-blue-400',
          icon: Info,
          headerBg: 'bg-blue-50 dark:bg-blue-900/20',
          confirmButton: confirmColor || 'bg-blue-600 hover:bg-blue-700',
        };
      default:
        return {
          iconColor: 'text-gray-600 dark:text-gray-400',
          icon: Info,
          headerBg: 'bg-gray-50 dark:bg-slate-800',
          confirmButton: confirmColor || 'bg-blue-600 hover:bg-blue-700',
        };
    }
  };

  const typeStyles = getTypeStyles();
  const IconComponent = typeStyles.icon;

  const content = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" 
        onClick={closeOnBackdrop ? onClose : undefined} 
      />
      
      {/* Modal */}
      <div className="relative z-[10001] bg-white dark:bg-archive-dark-panel rounded-xl shadow-2xl w-full max-w-sm transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className={`flex items-center gap-3 p-6 rounded-t-xl ${typeStyles.headerBg} transition-colors duration-300`}>
          {showIcon && (
            <div className={`flex-shrink-0 ${typeStyles.iconColor}`}>
              <IconComponent style={{ width: '1.5em', height: '1.5em' }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate transition-colors duration-300">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-all duration-200"
            aria-label="Kapat"
            title="Kapat"
          >
            <X style={{ width: '1.25em', height: '1.25em' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-gray-700 dark:text-gray-300 transition-colors duration-300">
          {children}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 bg-gray-50 dark:bg-slate-800/50 rounded-b-xl transition-colors duration-300">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600 dark:hover:border-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white ${typeStyles.confirmButton} transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 shadow-sm`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
