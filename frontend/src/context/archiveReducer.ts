
import {
  DEFAULT_SETTINGS,
  ALL_DEPARTMENTS,
  INITIAL_STORAGE_STRUCTURE,
} from '@/constants';
import { ArchiveState, ArchiveAction, Log } from '@/types';

export const initialState: ArchiveState = {
  folders: [],
  departments: ALL_DEPARTMENTS,
  checkouts: [],
  disposals: [],
  logs: [],
  settings: DEFAULT_SETTINGS,
  storageStructure: INITIAL_STORAGE_STRUCTURE,
  loading: true,
  error: null,
  sseConnected: false,
  lastBackupEvent: null,
  lastRestoreEvent: null,
  lastBackupCleanupEvent: null,
  initialBackupLog: null,
  initialRestoreLog: null,
  initialCleanupLog: null,
};

export const archiveReducer = (
  state: ArchiveState,
  action: ArchiveAction
): ArchiveState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_ALL_DATA':
      const logs = (action.payload.logs || []) as Log[];
      const sortedLogs = logs
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      const lastBackup = sortedLogs.find(l => l.type === 'backup' || l.details?.includes('Yedek alındı')) || null;
      const lastRestore = sortedLogs.find(l => l.type === 'restore' || l.details?.includes('geri yükleme')) || null;
      const lastCleanup = sortedLogs.find(l => l.type === 'backup_cleanup') || null;

      return { 
          ...state, 
          ...action.payload,
          logs: sortedLogs,
          initialBackupLog: lastBackup,
          initialRestoreLog: lastRestore,
          initialCleanupLog: lastCleanup,
      };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_DEPARTMENTS':
      return { ...state, departments: action.payload };
    case 'SET_STORAGE_STRUCTURE':
      return { ...state, storageStructure: action.payload };
    case 'SET_FOLDERS':
      return { ...state, folders: action.payload };
    case 'SET_CHECKOUTS':
      return { ...state, checkouts: action.payload };
    case 'SET_DISPOSALS':
      return { ...state, disposals: action.payload };
    case 'SET_LOGS':
      return { ...state, logs: action.payload.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) };
    case 'SET_SSE_CONNECTED':
      return { ...state, sseConnected: action.payload };
    case 'SET_LAST_BACKUP_EVENT':
      return { ...state, lastBackupEvent: action.payload };
    case 'SET_LAST_RESTORE_EVENT':
      return { ...state, lastRestoreEvent: action.payload };
    case 'SET_LAST_BACKUP_CLEANUP_EVENT':
      return { ...state, lastBackupCleanupEvent: action.payload };
    default:
      return state;
  }
};
