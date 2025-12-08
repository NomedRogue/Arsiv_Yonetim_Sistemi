import type { ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  duration?: number;
}

export interface ToastItem {
  id: number;
  type: ToastType;
  message: ReactNode;
  duration?: number;
}

let _id = 0;
const listeners = new Set<(t: ToastItem) => void>();

export function subscribe(cb: (t: ToastItem) => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function emit(type: ToastType, message: ReactNode, options?: ToastOptions) {
  const item: ToastItem = { 
    id: ++_id, 
    type, 
    message,
    duration: options?.duration 
  };
  listeners.forEach((l) => l(item));
  return item.id;
}

export const toast = {
  success: (msg: ReactNode, options?: ToastOptions) => emit('success', msg, options),
  error: (msg: ReactNode, options?: ToastOptions) => emit('error', msg, options),
  info: (msg: ReactNode, options?: ToastOptions) => emit('info', msg, options),
  warning: (msg: ReactNode, options?: ToastOptions) => emit('warning', msg, options),
};