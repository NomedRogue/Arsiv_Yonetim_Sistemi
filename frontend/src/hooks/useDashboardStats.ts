import { useState, useCallback, useEffect, useRef } from 'react';
import * as api from '@/api';
import { useArchive } from '@/context/ArchiveContext';
import { DashboardStats, Folder } from '@/types';
import { toast } from '@/lib/toast';

const initialStats: DashboardStats = {
  totalFolders: 0,
  tibbiCount: 0,
  idariCount: 0,
  arsivDisindaCount: 0,
  iadeGecikenCount: 0,
  buYilImhaEdilenecekCount: 0,
  gelecekYilImhaEdilenecekCount: 0,
  imhaSuresiGecenCount: 0,
  imhaEdilenCount: 0,
  overallOccupancy: 0,
  treemapData: [],
  clinicDistributionData: [],
  monthlyData: [],
  availableYears: [],
  disposalSchedule: [],
};

// Null-safe stats helper
const safeStats = (data: Partial<DashboardStats>): DashboardStats => ({
  ...initialStats,
  ...data,
  treemapData: Array.isArray(data?.treemapData) ? data.treemapData : [],
  clinicDistributionData: Array.isArray(data?.clinicDistributionData) ? data.clinicDistributionData : [],
  monthlyData: Array.isArray(data?.monthlyData) ? data.monthlyData : [],
  availableYears: Array.isArray(data?.availableYears) ? data.availableYears : [],
  disposalSchedule: Array.isArray(data?.disposalSchedule) ? data.disposalSchedule : [],
});

export const useDashboardStats = (
  treemapFilter: string,
  yearFilter: string | number
) => {
  const {
    sseConnected,
    lastBackupEvent,
    lastRestoreEvent,
    lastBackupCleanupEvent,
  } = useArchive();

  // State for silent loading (background updates)
  const [isInitialized, setIsInitialized] = useState(false);

  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [isLoading, setIsLoading] = useState(true);
  
  const [analysisFolders, setAnalysisFolders] = useState<Partial<Folder>[]>([]);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    // Only show full page loader on the very first load to prevent flickering
    if (!isInitialized) {
        setIsLoading(true);
    }

    try {
      const data = await api.getDashboardStats(treemapFilter, String(yearFilter));
      setStats(safeStats(data || {}));
    } catch (error: any) {
      if (error.message && !error.message.includes('Failed to fetch')) {
        toast.error(error.message || 'İstatistikler alınamadı');
      }
      // Keep existing stats on error if possible, or reset if critical
      if (!isInitialized) {
          setStats(initialStats);
      }
    } finally {
      setIsLoading(false);
    }
  }, [treemapFilter, yearFilter, isInitialized]);

  const fetchAnalysisData = useCallback(async () => {
    // Only show loading for analysis if we don't have data yet
    if (analysisFolders.length === 0) {
        setIsAnalysisLoading(true);
    }
    
    try {
      const folders = await api.getAllFoldersForAnalysis();
      setAnalysisFolders(folders);
    } catch (error: any) {
      if (error.message && !error.message.includes('Failed to fetch')) {
         console.error('Analiz verileri hatası:', error);
      }
      if (analysisFolders.length === 0) {
          setAnalysisFolders([]);
      }
    } finally {
      setIsAnalysisLoading(false);
      // Mark as initialized after both fetches are likely done or underway
      setIsInitialized(true); 
    }
  }, [analysisFolders.length]);

  // Initial Data Fetch
  useEffect(() => {
    fetchAnalysisData();
  }, [fetchAnalysisData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Track previous values to detect actual SSE changes
  const prevSseConnected = useRef(sseConnected);
  const prevBackupEvent = useRef(lastBackupEvent);
  const prevRestoreEvent = useRef(lastRestoreEvent);
  const prevCleanupEvent = useRef(lastBackupCleanupEvent);

  useEffect(() => {
    const connectionChanged = sseConnected && !prevSseConnected.current;
    const backupChanged = lastBackupEvent !== prevBackupEvent.current;
    const restoreChanged = lastRestoreEvent !== prevRestoreEvent.current;
    const cleanupChanged = lastBackupCleanupEvent !== prevCleanupEvent.current;

    if (connectionChanged || backupChanged || restoreChanged || cleanupChanged) {
      fetchStats();
      fetchAnalysisData(); 
    }

    prevSseConnected.current = sseConnected;
    prevBackupEvent.current = lastBackupEvent;
    prevRestoreEvent.current = lastRestoreEvent;
    prevCleanupEvent.current = lastBackupCleanupEvent;
  }, [
    sseConnected,
    lastBackupEvent,
    lastRestoreEvent,
    lastBackupCleanupEvent,
    fetchStats,
    fetchAnalysisData
  ]);

  return {
    stats,
    isLoading,
    analysisFolders,
    isAnalysisLoading
  };
};
