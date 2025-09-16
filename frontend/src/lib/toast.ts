// Basit, bağımsız toast yayınlayıcı.
// Bileşen kullanmadan her yerden toast.success('...') vb. çağırılabilir.

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

let _id = 0;
const listeners = new Set<(t: ToastItem) => void>();

export function subscribe(cb: (t: ToastItem) => void) {
  listeners.add(cb);
  // Set.delete boolean döndürür; cleanup fonksiyonlarının void olması için sarmalıyoruz.
  return () => {
    listeners.delete(cb);
  };
}

function emit(type: ToastType, message: string) {
  const item: ToastItem = { id: ++_id, type, message };
  listeners.forEach((l) => l(item));
  return item.id;
}

export const toast = {
  success: (msg: string) => emit('success', msg),
  error: (msg: string) => emit('error', msg),
  info: (msg: string) => emit('info', msg),
  warning: (msg: string) => emit('warning', msg),
};