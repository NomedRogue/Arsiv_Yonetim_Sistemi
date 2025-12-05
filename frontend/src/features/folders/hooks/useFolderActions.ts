/**
 * Folder Actions Hook
 * Handles folder CRUD operations (create, update, delete)
 * Extracted from useArchiveActions for feature-based organization
 */

import { useCallback, Dispatch } from 'react';
import type { 
  ArchiveAction, 
  ArchiveState, 
  Folder, 
  FolderStatus,
  Log 
} from '@/types';
import { toast } from '@/lib/toast';
import * as api from '@/api';
import { getFolderLogDetails } from '../utils/folderHelpers';

/**
 * Return type for useFolderActions hook
 */
interface UseFolderActionsReturn {
  addFolder: (
    folderData: Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ) => Promise<void>;
  
  updateFolder: (folder: Folder) => Promise<void>;
  
  deleteFolder: (folderId: number) => Promise<void>;
}

/**
 * Custom hook for folder operations
 * @param state - Archive state
 * @param dispatch - State dispatch function
 * @returns Folder action methods
 */
export const useFolderActions = (
  state: ArchiveState,
  dispatch: Dispatch<ArchiveAction>
): UseFolderActionsReturn => {
  
  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
  
  /**
   * Get department name by ID
   */
  const getDepartmentName = useCallback(
    (id: number) => 
      state.departments.find((d) => d.id === id)?.name || 'Bilinmeyen Birim',
    [state.departments]
  );
  
  /**
   * Get folder by ID from state
   */
  const getFolderById = useCallback(
    (id: number) => (state.folders || []).find((f) => f.id === id),
    [state.folders]
  );
  
  /**
   * Add log entry to state and persist to backend
   * Note: Logging is critical, so we don't revert state on log save failure
   */
  const addLog = useCallback(
    (log: Omit<Log, 'id' | 'timestamp'>) => {
      const newLog: Log = { 
        ...log, 
        id: Date.now(), 
        timestamp: new Date() 
      };
      dispatch({ type: 'SET_LOGS', payload: [newLog, ...state.logs] });
      
      api.addLogEntry(log).catch(e => {
        console.error("Log save failed:", e.message);
        toast.error(`Log kaydedilemedi: ${e.message}`);
      });
    },
    [state.logs, dispatch]
  );
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  /**
   * Add new folder to archive
   * - Creates folder with auto-generated ID and timestamps
   * - Optimistically updates UI
   * - Reverts on error
   * 
   * @param folderData - Folder data without auto-generated fields
   */
  const addFolder = useCallback(
    async (folderData: Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
      const newFolder: Folder = {
        ...folderData,
        id: Date.now(),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'Arşivde' as FolderStatus,
      };
      
      const previousFolders = state.folders || [];
      dispatch({ type: 'SET_FOLDERS', payload: [newFolder, ...previousFolders] });
      
      try {
        await api.createFolder(newFolder);
        toast.success('Klasör başarıyla kaydedildi!');
        addLog({ 
          type: 'create', 
          folderId: newFolder.id, 
          details: `Yeni klasör eklendi: ${getFolderLogDetails(newFolder, getDepartmentName(newFolder.departmentId))}` 
        });
      } catch (e: any) {
        toast.error(`Klasör kaydedilemedi: ${e.message}`);
        dispatch({ type: 'SET_FOLDERS', payload: previousFolders });
      }
    },
    [state.folders, dispatch, addLog, getDepartmentName]
  );
  
  /**
   * Update existing folder
   * - Updates timestamp
   * - Optimistically updates UI
   * - Reverts on error
   * 
   * @param updatedFolder - Complete folder object with updates
   */
  const updateFolder = useCallback(
    async (updatedFolder: Folder) => {
      const folderWithTimestamp = { ...updatedFolder, updatedAt: new Date() };
      const previousFolders = state.folders || [];
      const nextFolders = previousFolders.map((f) => 
        f.id === folderWithTimestamp.id ? folderWithTimestamp : f
      );
      dispatch({ type: 'SET_FOLDERS', payload: nextFolders });

      try {
        await api.updateFolder(folderWithTimestamp);
        toast.success('Klasör başarıyla güncellendi!');
        addLog({ 
          type: 'update', 
          folderId: updatedFolder.id, 
          details: `Klasör güncellendi: ${getFolderLogDetails(updatedFolder, getDepartmentName(updatedFolder.departmentId))}` 
        });
      } catch (e: any) {
        toast.error(`Klasör güncellenemedi: ${e.message}`);
        dispatch({ type: 'SET_FOLDERS', payload: previousFolders });
      }
    },
    [state.folders, dispatch, addLog, getDepartmentName]
  );
  
  /**
   * Delete folder and all related records (cascade)
   * - Deletes folder, checkouts, and disposal records
   * - Validates folder exists and is not checked out
   * - Optimistically updates UI
   * - Reverts all changes on error
   * 
   * @param folderId - ID of folder to delete
   */
  const deleteFolder = useCallback(
    async (folderId: number) => {
      const folder = getFolderById(folderId);
      
      if (!folder) {
        toast.error('Silinmek istenen klasör bulunamadı.');
        return;
      }
      
      if (folder.status === 'Çıkışta' as FolderStatus) {
        toast.error('Bu klasör şu anda kullanıcıda olduğu için silinemez. Önce iade edilmesi gerekiyor.');
        return;
      }
      
      // Store previous state for rollback
      const previousState = { 
        folders: state.folders, 
        checkouts: state.checkouts, 
        disposals: state.disposals 
      };
      
      // Optimistically remove folder and related records
      dispatch({ 
        type: 'SET_FOLDERS', 
        payload: (state.folders || []).filter((f) => f.id !== folderId) 
      });
      dispatch({ 
        type: 'SET_CHECKOUTS', 
        payload: (state.checkouts || []).filter((c) => c.folderId !== folderId) 
      });
      dispatch({ 
        type: 'SET_DISPOSALS', 
        payload: (state.disposals || []).filter((d) => d.folderId !== folderId) 
      });

      try {
        await api.removeFolder(folderId);
        toast.success('Klasör ve ilişkili kayıtlar silindi.');
        addLog({ 
          type: 'delete', 
          folderId, 
          details: `Klasör kalıcı olarak silindi: ${getFolderLogDetails(folder, getDepartmentName(folder.departmentId))}` 
        });
      } catch (e: any) {
        // Extract clean error message from API response
        let errorMessage = 'Klasör silinemedi';
        if (e.response?.data?.error) {
          errorMessage = e.response.data.error;
        } else if (e.message && !e.message.includes('{')) {
          errorMessage = e.message;
        }
        toast.error(errorMessage);
        // Rollback all changes
        dispatch({ type: 'SET_FOLDERS', payload: previousState.folders });
        dispatch({ type: 'SET_CHECKOUTS', payload: previousState.checkouts });
        dispatch({ type: 'SET_DISPOSALS', payload: previousState.disposals });
      }
    },
    [state.folders, state.checkouts, state.disposals, dispatch, addLog, getFolderById, getDepartmentName]
  );
  
  return {
    addFolder,
    updateFolder,
    deleteFolder,
  };
};
