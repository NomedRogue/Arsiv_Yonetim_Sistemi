import React, { ReactNode, useEffect, useRef, useId } from 'react';
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
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus management logic
    const modalElement = modalRef.current;
    if (modalElement) {
        const focusableElements = modalElement.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Focus the first element or the modal itself
        if (firstElement) {
            firstElement.focus();
        } else {
            modalElement.focus();
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }

            if (e.key === 'Tab') {
                // Trap focus
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement?.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement?.focus();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = originalOverflow;
            // Restore focus
            previousFocusRef.current?.focus();
        };
    }
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
          iconColor: 'text-teal-600 dark:text-teal-400',
          icon: Info,
          headerBg: 'bg-teal-50 dark:bg-teal-900/20',
          confirmButton: confirmColor || 'bg-teal-600 hover:bg-teal-700',
        };
      default:
        return {
          iconColor: 'text-gray-600 dark:text-gray-400',
          icon: Info,
          headerBg: 'bg-gray-50 dark:bg-slate-800',
          confirmButton: confirmColor || 'bg-teal-600 hover:bg-teal-700',
        };
    }
  };

  const typeStyles = getTypeStyles();
  const IconComponent = typeStyles.icon;

  const content = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      ref={modalRef}
      tabIndex={-1}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" 
        onClick={closeOnBackdrop ? onClose : undefined} 
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="relative z-[10001] bg-white dark:bg-archive-dark-panel rounded-xl shadow-2xl w-full max-w-sm transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className={`flex items-center gap-3 p-6 rounded-t-xl ${typeStyles.headerBg} transition-colors duration-300`}>
          {showIcon && (
            <div className={`flex-shrink-0 ${typeStyles.iconColor}`} aria-hidden="true">
              <IconComponent style={{ width: '1.5em', height: '1.5em' }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white truncate transition-colors duration-300">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-all duration-200"
            aria-label="Kapat"
            title="Kapat"
          >
            <X style={{ width: '1.25em', height: '1.25em' }} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div id={descriptionId} className="p-6 text-gray-700 dark:text-gray-300 transition-colors duration-300">
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
