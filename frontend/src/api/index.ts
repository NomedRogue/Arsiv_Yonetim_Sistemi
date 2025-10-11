// frontend/src/api/index.ts
import { Folder, Checkout, Disposal, Log, Settings, Department, StorageStructure, Location, DashboardStats } from '@/types';

// Production'da (Electron) veya development'da doğru URL kullan
const API: string = import.meta.env.DEV 
  ? '/api'  // Dev modda Vite proxy kullan
  : 'http://localhost:3001/api';  // Production'da (Electron) direkt backend'e bağlan

// Küçük yardımcı fetch sarmalayıcı
async function http<T = any>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    let errorBody = '';
    try {
      const jsonError = await res.json();
      errorBody = jsonError.error?.message || JSON.stringify(jsonError);
    } catch {
      errorBody = await res.text().catch(() => res.statusText);
    }
    throw new Error(errorBody);
  }
  if (res.status === 204) return undefined as unknown as T;
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// Dashboard endpoints
export const getDashboardStats = (treemapFilter?: string, yearFilter?: string): Promise<DashboardStats> => {
  const params = new URLSearchParams();
  if (treemapFilter) params.append('treemapFilter', treemapFilter);
  if (yearFilter) params.append('yearFilter', yearFilter);
  return http<DashboardStats>(`${API}/dashboard-stats?${params.toString()}`);
};

export const getAllData = () => http(`${API}/all-data`);
export const saveConfigs = (configs: { settings?: any; departments?: any; storageStructure?: any }) => http(`${API}/save-configs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(configs) });

// Folder Actions
export const createFolder = (folder: Folder) => http<Folder>(`${API}/folders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(folder) });
export const updateFolder = (folder: Folder) => http<Folder>(`${API}/folders/${folder.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(folder) });
export const removeFolder = (folderId: number) => http(`${API}/folders/${folderId}`, { method: 'DELETE' });
export const getFolder = (folderId: number) => http<Folder>(`${API}/folders/${folderId}`);
export const getFolders = (params?: URLSearchParams) => http(`${API}/folders${params ? `?${params.toString()}` : ''}`);
export const getAllFoldersForAnalysis = () => http<Folder[]>(`${API}/all-folders-for-analysis`);
export const getFoldersByLocation = (location: Location) => http<Folder[]>(`${API}/folders-by-location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(location)
});
export const getDisposableFolders = (filter: string) => http<Folder[]>(`${API}/folders/disposable?filter=${filter}`);


// Checkout Actions
export const createCheckout = (checkout: Checkout) => http<Checkout>(`${API}/checkouts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(checkout) });
export const updateCheckout = (checkout: Checkout) => http<Checkout>(`${API}/checkouts/${checkout.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(checkout) });
export const getActiveCheckouts = () => http<(Checkout & { folder: Folder })[]>(`${API}/checkouts/active`);

// Disposal Actions
export const getDisposals = () => http<Disposal[]>(`${API}/disposals`);
export const createDisposal = (disposal: Disposal) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[FRONTEND API] Creating disposal:', disposal);
  }
  return http<Disposal>(`${API}/disposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(disposal) });
};

// Log Actions
export const addLogEntry = (log: Omit<Log, 'id' | 'timestamp'>) => http(`${API}/logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(log) });

// PDF Actions
export async function uploadPdf(file: File) {
  const form = new FormData();
  form.append('pdf', file);
  return http<{filename: string}>(`${API}/upload-pdf`, { method: 'POST', body: form });
}

export async function deletePdf(filename: string) {
  return http(`${API}/delete-pdf/${encodeURIComponent(filename)}`, { method: 'DELETE' });
}

export async function deleteBackup(filename: string) {
  return http(`${API}/delete-backup/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
}

export async function getBackups() {
  return http<{backups: any[], folder: string}>(`${API}/list-backups`);
}

export async function backupDbToFolder() {
  return http(`${API}/backup-db-to-folder`, { method: 'POST' });
}

export async function restoreDbFromBackup(filename: string) {
  return http(`${API}/restore-db-from-backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  });
}