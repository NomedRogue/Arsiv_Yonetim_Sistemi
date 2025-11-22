import { useReducer, useCallback, useEffect } from 'react';
import { archiveReducer, initialState } from '../context/archiveReducer';
import {
  DEFAULT_SETTINGS,
  ALL_DEPARTMENTS,
  INITIAL_STORAGE_STRUCTURE,
} from '@/constants';
import { getAllData, getAllFoldersForAnalysis } from '@/api';
import { toast } from '@/lib/toast';

const parseDates = (items: any[], dateKeys: string[]) =>
  items.map((item) => {
    const n = { ...item };
    dateKeys.forEach((k) => {
      if (n[k]) n[k] = new Date(n[k]);
    });
    return n;
  });

export const useArchiveState = () => {
  const [state, dispatch] = useReducer(archiveReducer, initialState);

  const refresh = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const data = await getAllData();
      
      // TÜM klasörleri yükle (doluluk hesaplaması için)
      // Not: getAllFoldersForAnalysis sadece lokasyon ve folderType bilgisini içerir (hafif)
      const allFoldersForOccupancy = await getAllFoldersForAnalysis();

      // BUGFIX: Sadece data.settings null/undefined ise DEFAULT_SETTINGS kullan
      // Eğer data.settings bir obje ise (boş bile olsa), onu kullan ve eksik alanları DEFAULT_SETTINGS ile doldur
      const mergedSettings = data.settings 
        ? { ...DEFAULT_SETTINGS, ...data.settings }
        : DEFAULT_SETTINGS;

      dispatch({
        type: 'SET_ALL_DATA',
        payload: {
          settings: mergedSettings,
          departments: data.departments || ALL_DEPARTMENTS,
          storageStructure: data.storageStructure || INITIAL_STORAGE_STRUCTURE,
          folders: allFoldersForOccupancy || [],
          checkouts: parseDates(data.checkouts || [], ['checkoutDate', 'plannedReturnDate', 'actualReturnDate']),
          disposals: parseDates(data.disposals || [], ['disposalDate']),
          logs: parseDates(data.logs || [], ['timestamp']),
        },
      });
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', payload: e.message || 'Veri yüklenemedi.' });
      toast.error('Veri yüklenirken bir hata oluştu.');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);
  
  // Initial load
  useEffect(() => {
      refresh();
  }, [refresh]);

  return { state, dispatch, refresh };
};