
import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import '../styles/liquid-gauge.css';
import { useArchive } from '@/context/ArchiveContext';
import { DashboardCard } from '@/components/DashboardCard';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Treemap, AreaChart, Area, Sector, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Folder, FileText, AlertTriangle, ChevronsRight, BookX, HardDrive, RotateCcw, Trash2, Loader2, Calendar, Clock } from 'lucide-react';
import { Category, CheckoutStatus, FolderStatus, Log, StorageType, Folder as FolderType, Settings, StorageStructure, DashboardStats } from '@/types';
import { CustomAreaChartTooltip, CustomizedTreemapContent, CustomPieTooltip, CustomTreemapTooltip } from '../components/dashboard/DashboardCharts';
import { useTheme } from '@/hooks/useTheme';
import { getCardIconColor, getOccupancyColor, getOccupancyTextClass, THEME_COLORS } from '@/lib/theme';
import { toast } from '@/lib/toast';
import * as api from '@/api';
import '../styles/dashboard-grid.css';

// Lazy load heavy components
const LocationAnalysis = lazy(() => import('../components/dashboard/LocationAnalysis').then(module => ({ default: module.LocationAnalysis })));
const RecentActivityList = lazy(() => import('../components/dashboard/RecentActivityList').then(module => ({ default: module.RecentActivityList })));

const basename = (p?: string) => (p ? p.split(/[\\/]/).pop() : undefined);

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
};

interface DashboardProps {
  onNavigate: (page: string, params?: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const {
    logs,
    settings,
    storageStructure,
    initialBackupLog,
    initialRestoreLog,
    initialCleanupLog,
    sseConnected,
  } = useArchive();

  const [theme, toggleTheme] = useTheme();
  const [pieActiveIndex, setPieActiveIndex] = useState(0);
  const [isPieHovered, setIsPieHovered] = useState(false);
  const [treemapFilter, setTreemapFilter] = useState<'all' | StorageType.Kompakt | StorageType.Stand>('all');
  const [yearFilter, setYearFilter] = useState<'last12' | number>('last12');
  const [forceUpdate, setForceUpdate] = useState(0); // Force re-render için
  
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [isLoading, setIsLoading] = useState(true);

  const [analysisFolders, setAnalysisFolders] = useState<Partial<FolderType>[]>([]);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true);
  
  // Backup ve restore event state'leri
  const [lastBackupEvent, setLastBackupEvent] = useState<any>(null);
  const [lastRestoreEvent, setLastRestoreEvent] = useState<any>(null);
  const [lastBackupCleanupEvent, setLastBackupCleanupEvent] = useState<any>(null);

  // Dashboard cards data - tema değiştiğinde yeniden hesapla
  const dashboardCardsData = useMemo(() => [
    { title: "Toplam Klasör", value: stats.totalFolders, icon: Folder, onClick: () => onNavigate('Arşiv') },
    { title: "Tıbbi", value: stats.tibbiCount, icon: FileText, onClick: () => onNavigate('Arşiv') },
    { title: "İdari", value: stats.idariCount, icon: FileText, onClick: () => onNavigate('Arşiv') },
    { title: "Arşiv Dışında", value: stats.arsivDisindaCount, icon: ChevronsRight, onClick: () => onNavigate('Çıkış/İade Takip') },
    { title: "İade Geciken", value: stats.iadeGecikenCount, icon: AlertTriangle, onClick: () => onNavigate('Çıkış/İade Takip') },
    { title: "Bu Yıl İmha Edilecekler", value: stats.buYilImhaEdilenecekCount, icon: BookX, onClick: () => onNavigate('İmha', { tab: 'disposable', filter: 'thisYear' }) },
    { title: "Gelecek Yıl İmha Edilecekler", value: stats.gelecekYilImhaEdilenecekCount, icon: Calendar, onClick: () => onNavigate('İmha', { tab: 'disposable', filter: 'nextYear' }) },
    { title: "İmha Süresi Geçenler", value: stats.imhaSuresiGecenCount, icon: Clock, onClick: () => onNavigate('İmha', { tab: 'disposable', filter: 'overdue' }) },
    { title: "İmha Edilen", value: stats.imhaEdilenCount, icon: Trash2, onClick: () => onNavigate('İmha', { tab: 'disposed' }) }
  ], [stats, onNavigate, theme]); // theme eklendi


  useEffect(() => {
    const fetchAnalysisData = async () => {
      setIsAnalysisLoading(true);
      try {
        const folders = await api.getAllFoldersForAnalysis();
        setAnalysisFolders(folders);
      } catch (error: any) {
        // Sadece gerçek hataları göster, boş veri durumunu değil
        if (error.message && !error.message.includes('Failed to fetch')) {
          toast.error(`Analiz verileri alınamadı: ${error.message}`);
        }
        setAnalysisFolders([]);
      } finally {
        setIsAnalysisLoading(false);
      }
    };
    fetchAnalysisData();
  }, []);

  const fetchStats = useCallback(async (treemap: string, year: string | number) => {
    setIsLoading(true);
    try {
      const data = await api.getDashboardStats(treemap, String(year));
      setStats(data);
    } catch (error: any) {
      // Sadece gerçek hataları göster, boş veri durumunu değil
      if (error.message && !error.message.includes('Failed to fetch')) {
        toast.error(error.message || 'İstatistikler alınamadı');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchStats(treemapFilter, yearFilter);
  }, [treemapFilter, yearFilter, fetchStats]);
  
  // SSE listener: Klasör değişikliklerinde otomatik stats ve analiz yenile
  useEffect(() => {
    const baseUrl = window.location.protocol === 'file:' ? 'http://localhost:3001' : '';
    const eventSource = new EventSource(`${baseUrl}/api/events`);
    
    const handleDataChange = () => {
      // Stats ve analiz verilerini yenile
      fetchStats(treemapFilter, yearFilter);
      // Analiz verilerini yenile
      api.getAllFoldersForAnalysis().then(setAnalysisFolders).catch(() => {});
    };
    
    eventSource.addEventListener('folder_created', handleDataChange);
    eventSource.addEventListener('folder_updated', handleDataChange);
    eventSource.addEventListener('folder_deleted', handleDataChange);
    eventSource.addEventListener('checkout_created', handleDataChange);
    eventSource.addEventListener('checkout_updated', handleDataChange);
    
    // Yedekleme event'lerini dinle
    eventSource.addEventListener('backup', (e: any) => {
      const data = JSON.parse(e.data);
      setLastBackupEvent({
        ts: new Date(data.ts),
        reason: data.reason,
        path: data.path,
        filename: data.filename
      });
    });
    
    eventSource.addEventListener('backup_completed', (e: any) => {
      const data = JSON.parse(e.data);
      setLastBackupEvent({
        ts: new Date(data.timestamp),
        reason: 'auto',
        filename: data.file ? basename(data.file) : 'bilinmiyor'
      });
    });
    
    eventSource.addEventListener('restore', (e: any) => {
      const data = JSON.parse(e.data);
      setLastRestoreEvent({
        ts: new Date(data.ts),
        filename: data.filename,
        source: data.source || 'unknown'
      });
      // Restore sonrası stats'ı yenile
      handleDataChange();
    });
    
    eventSource.addEventListener('backup_cleanup', (e: any) => {
      const data = JSON.parse(e.data);
      setLastBackupCleanupEvent({
        ts: new Date(data.ts),
        count: data.count || 0,
        deleted: data.deleted || []
      });
    });
    
    return () => {
      eventSource.close();
    };
  }, [treemapFilter, yearFilter, fetchStats]);

    // Fix for CSS transition reset after window minimize/maximize
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Force re-render after visibility change
        const dashboardCards = document.querySelectorAll('.dashboard-card, .storage-config-card');
        dashboardCards.forEach(card => {
          card.classList.add('will-change-transform');
          setTimeout(() => card.classList.remove('will-change-transform'), 100);
        });
      }
    };

    const handleThemeChange = () => {
      // Force component re-render when theme changes
      if (import.meta.env.DEV) console.log('[DASHBOARD] Theme changed event received');
      setForceUpdate(prev => prev + 1); // Force re-render
      setTimeout(() => {
        setStats(prev => ({ ...prev }));
      }, 100);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('theme-changed', handleThemeChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  // Theme değiştiğinde force update
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (import.meta.env.DEV) console.log('[DASHBOARD] Theme changed to:', theme);
    }
    setForceUpdate(prev => prev + 1);
    
    // FORCE SVG UPDATE - Manuel DOM manipulation with requestAnimationFrame
    requestAnimationFrame(() => {
      const bgCircle = document.querySelector('#occupancy-bg-circle');
      const progressCircle = document.querySelector('#occupancy-progress-circle');
      
      if (bgCircle && progressCircle) {
        const bgColor = THEME_COLORS[theme].occupancy.background;
        const progressColor = getOccupancyColor(theme, stats.overallOccupancy);
        
        // Force browser to repaint
        bgCircle.setAttribute('stroke', bgColor);
        progressCircle.setAttribute('stroke', progressColor);
        
        if (process.env.NODE_ENV === 'development') {
          if (import.meta.env.DEV) console.log('[DASHBOARD] SVG circles updated manually:', { bgColor, progressColor, theme });
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[DASHBOARD] SVG circles not found in DOM!');
        }
      }
    });
  }, [theme, stats.overallOccupancy]);

  const finalLastBackup = useMemo(() => {
    if (lastBackupEvent) {
        return {
            ts: lastBackupEvent.ts,
            details: `Yedek alındı (${lastBackupEvent.reason || 'manuel'}). Dosya: ${lastBackupEvent.filename || basename(lastBackupEvent.path || '') || 'bilinmiyor'}`,
            label: lastBackupEvent.reason === 'auto' ? 'Otomatik' : 'Manuel'
        };
    }
    if (initialBackupLog) {
        return {
            ts: new Date(initialBackupLog.timestamp),
            details: initialBackupLog.details,
            label: initialBackupLog.details.includes('(auto)') ? 'Otomatik' : 'Manuel'
        };
    }
    return null;
  }, [lastBackupEvent, initialBackupLog]);

  // SVG HTML - theme, occupancy VE forceUpdate değiştiğinde yeniden hesapla
  const svgHTML = useMemo(() => {
    const bgColor = THEME_COLORS[theme].occupancy.background;
    const progressColor = getOccupancyColor(theme, stats.overallOccupancy);
    const dashArray = `${(stats.overallOccupancy / 100) * 264} 264`;
    
    // Add timestamp to force new string instance
    const timestamp = Date.now();
    
    if (process.env.NODE_ENV === 'development') {
      if (import.meta.env.DEV) console.log('[DASHBOARD] SVG HTML regenerated:', { theme, bgColor, progressColor, forceUpdate, timestamp });
    }
    
    return `
      <svg class="transform -rotate-90" viewBox="0 0 100 100" style="width: 100%; height: 100%;" data-theme="${theme}" data-update="${forceUpdate}" data-ts="${timestamp}">
        <circle
          id="occupancy-bg-circle"
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="${bgColor}"
          stroke-width="8"
        />
        <circle
          id="occupancy-progress-circle"
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="${progressColor}"
          stroke-width="8"
          stroke-linecap="round"
          stroke-dasharray="${dashArray}"
        />
      </svg>
    `;
  }, [theme, stats.overallOccupancy, forceUpdate]);
  
  const finalLastRestore = useMemo(() => {
    if (lastRestoreEvent) {
        return {
            ts: lastRestoreEvent.ts,
            details: `Yedekten geri yüklendi: ${lastRestoreEvent.filename}`,
            label: lastRestoreEvent.source === 'upload' ? 'Yüklemeden' : 'Geçmişten'
        };
    }
    if (initialRestoreLog) {
        return {
            ts: new Date(initialRestoreLog.timestamp),
            details: initialRestoreLog.details,
            label: 'Geri Yükleme'
        };
    }
    return null;
  }, [lastRestoreEvent, initialRestoreLog]);

  const finalLastCleanup = useMemo(() => {
    if (lastBackupCleanupEvent) {
        const count = lastBackupCleanupEvent.count ?? 0;
        const deletedFiles = lastBackupCleanupEvent.deleted ?? [];
        const details = count > 0
            ? `Silinen dosyalar: ${deletedFiles.join(', ')}`
            : 'Temizlenecek eski yedek bulunamadı.';

        return {
            ts: lastBackupCleanupEvent.ts,
            details,
            label: `${count} eski yedek silindi`
        };
    }
    if (initialCleanupLog) {
        const match = initialCleanupLog.details.match(/(\d+)\s+adet/);
        const count = match ? parseInt(match[1], 10) : 0;
        return {
            ts: new Date(initialCleanupLog.timestamp),
            details: initialCleanupLog.details,
            label: `${count} eski yedek silindi`
        };
    }
    return null;
  }, [lastBackupCleanupEvent, initialCleanupLog]);
  
  useEffect(() => {
    if (isPieHovered) return;
    const interval = setInterval(() => {
      setPieActiveIndex((prevIndex) => (prevIndex + 1) % 2);
    }, 10000);
    return () => clearInterval(interval);
  }, [isPieHovered]);

  const onPieEnter = useCallback((_: any, index: number) => {
    setIsPieHovered(true);
    setPieActiveIndex(index);
  }, []);

  const onPieLeave = useCallback(() => {
    setIsPieHovered(false);
  }, []);
  
  const occupancyData = [
    { name: 'Kullanılan', value: stats.overallOccupancy || 0 },
    { name: 'Boş Alan', value: 100 - (stats.overallOccupancy || 0) },
  ];
  // Theme-aware colors for charts - Logical color scheme: Green=Available, Red/Amber=Used
  const PIE_COLORS = useMemo(() => {
    const occupancyRate = stats.overallOccupancy || 0;
    
    // Base colors for different themes - Logical approach
    const darkThemeColors = {
      empty: '#10B981', // Green for available space (good)
      used: occupancyRate > 80 ? '#EF4444' : occupancyRate > 60 ? '#F59E0B' : '#6B7280' // Red/Amber/Gray based on usage
    };
    
    const lightThemeColors = {
      empty: '#059669', // Green for available space (good)
      used: occupancyRate > 80 ? '#DC2626' : occupancyRate > 60 ? '#D97706' : '#6B7280' // Red/Amber/Gray based on usage
    };
    
    return theme === 'dark' 
      ? [darkThemeColors.used, darkThemeColors.empty]
      : [lightThemeColors.used, lightThemeColors.empty];
  }, [theme, stats.overallOccupancy]);  const SUNBURST_COLORS = [
    '#8884d8',
    '#83a6ed',
    '#8dd1e1',
    '#82ca9d',
    '#a4de6c',
    '#d0ed57',
    '#ffc658',
    '#fd7f6f',
    '#7eb0d5',
    '#b2e061',
    '#ffb55a',
    '#ffee65',
    '#beb9db',
    '#fdcce5',
    '#8bd3c7',
  ];

  if (isLoading && stats.totalFolders === 0) { // Sadece ilk yüklemede göster
    return (
      <div className="p-6 flex justify-center items-center h-[calc(100vh-150px)]">
        <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-5 xl:grid-cols-9 gap-4 mb-6">
        {dashboardCardsData.map((card, index) => {
          const iconColor = getCardIconColor(theme, card.title);
          return (
            <div key={index} onClick={card.onClick} className="bg-white dark:bg-slate-700 rounded-lg p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer min-h-[5rem] flex items-center border border-gray-200 dark:border-slate-600 shadow-sm dark:hover:shadow-slate-600/20">
              <div className="mr-3 flex-shrink-0 transition-colors duration-200" style={{ color: iconColor }}>
                <card.icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 truncate">
                  {card.title}
                </h3>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {card.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Backup Status Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-700 rounded-lg p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border border-gray-200 dark:border-slate-600">
          <div className="flex items-center">
            <HardDrive size={20} className="text-blue-600 dark:text-blue-400 mr-3" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">Son Yedekleme</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {finalLastBackup?.label || '—'}
              </span>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {finalLastBackup?.ts ? finalLastBackup.ts.toLocaleString() : '—'}
              </div>
              {finalLastBackup?.details && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {finalLastBackup.details}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-700 rounded-lg p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border border-gray-200 dark:border-slate-600">
          <div className="flex items-center">
            <RotateCcw size={20} className="text-amber-600 dark:text-amber-400 mr-3" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">Son Geri Yükleme</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {finalLastRestore?.label || '—'}
              </span>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {finalLastRestore?.ts ? finalLastRestore.ts.toLocaleString() : '—'}
              </div>
              {finalLastRestore?.details && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {finalLastRestore.details}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-700 rounded-lg p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border border-gray-200 dark:border-slate-600">
          <div className="flex items-center">
            <Trash2 size={20} className="text-rose-600 dark:text-rose-400 mr-3" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">Eski Yedek Temizliği</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                {finalLastCleanup?.label || '—'}
              </span>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {finalLastCleanup?.ts ? new Date(finalLastCleanup.ts).toLocaleString() : '—'}
              </div>
              {finalLastCleanup?.details && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {finalLastCleanup.details}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 transition-colors duration-300">Arşiv Dağılımı</h3>
        <div className="flex space-x-2 border-b dark:border-gray-700 mb-4 transition-colors duration-300">
          <button
            onClick={() => setTreemapFilter('all')}
            className={`px-3 py-2 text-sm font-medium transition-colors duration-300 ${
              treemapFilter === 'all' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setTreemapFilter(StorageType.Kompakt)}
            className={`px-3 py-2 text-sm font-medium transition-colors duration-300 ${
              treemapFilter === StorageType.Kompakt ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Kompakt Dolap
          </button>
          <button
            onClick={() => setTreemapFilter(StorageType.Stand)}
            className={`px-3 py-2 text-sm font-medium transition-colors duration-300 ${
              treemapFilter === StorageType.Stand ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Stand
          </button>
        </div>
        <ResponsiveContainer width="100%" height={500}>
          <Treemap data={stats.treemapData} dataKey="size" isAnimationActive={false} content={<CustomizedTreemapContent theme={theme} />}>
            <Tooltip content={<CustomTreemapTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        <div className="dashboard-card">
          <h3 className="text-base lg:text-lg font-bold text-gray-800 dark:text-white mb-4 transition-colors duration-300">
            Tıbbi Kayıtların Klinik Dağılımı
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.clinicDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={110} fill="#8884d8" paddingAngle={2}>
                {stats.clinicDistributionData.map((entry: any, index: number) => (
                  <Cell key={`cell-clinic-${index}`} fill={SUNBURST_COLORS[index % SUNBURST_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Arşiv Doluluk Durumu */}
        <div key={`occupancy-card-${theme}-${forceUpdate}`} className="dashboard-card relative overflow-hidden" style={{ cursor: 'default' }}>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-8 text-center">
            Arşiv Doluluk Durumu
          </h3>
          
          <div className="flex flex-col items-center gap-8 py-4">
            {/* Circular Progress Chart */}
            <div className="relative" style={{ width: '280px', height: '280px' }}>
              <div 
                key={`svg-container-${theme}-${forceUpdate}-${stats.overallOccupancy}`}
                dangerouslySetInnerHTML={{ __html: svgHTML }}
                style={{ width: '100%', height: '100%' }}
              />
              
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-6xl font-bold leading-none mb-2 ${getOccupancyTextClass(theme, stats.overallOccupancy)}`}>
                  {stats.overallOccupancy.toFixed(1)}%
                </div>
                <div className={`text-sm font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Dolu
                </div>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div key={`stats-${theme}`} className="grid grid-cols-2 gap-6 w-full max-w-md">
              {/* Dolu Alan Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-700/70 border border-gray-300 dark:border-slate-600/70 shadow-sm transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div key={`dot-filled-${theme}-${stats.overallOccupancy}`} className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors duration-200 ${
                    stats.overallOccupancy > 85 
                      ? 'bg-red-500 dark:bg-red-400'
                      : stats.overallOccupancy > 70 
                      ? 'bg-amber-500 dark:bg-amber-400'
                      : stats.overallOccupancy > 50 
                      ? 'bg-blue-500 dark:bg-blue-400'
                      : 'bg-emerald-500 dark:bg-emerald-400'
                  }`}></div>
                  <div className="flex-1">
                    <div className="text-xs mb-1 text-gray-600 dark:text-gray-300 transition-colors duration-200">
                      Dolu Alan
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-200">
                      {stats.overallOccupancy.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Boş Alan Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-700/70 border border-gray-300 dark:border-slate-600/70 shadow-sm transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div key={`dot-empty-${theme}`} className="w-3 h-3 rounded-full flex-shrink-0 bg-gray-500 dark:bg-slate-400 transition-colors duration-200"></div>
                  <div className="flex-1">
                    <div className="text-xs mb-1 text-gray-600 dark:text-gray-300 transition-colors duration-200">
                      Boş Alan
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-200">
                      {(100 - stats.overallOccupancy).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status Badge */}
            <div key={`badge-${theme}-${stats.overallOccupancy}`} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
              stats.overallOccupancy > 85 
                ? 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-400/30'
                : stats.overallOccupancy > 70 
                ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-200 border border-amber-200 dark:border-amber-400/30'
                : stats.overallOccupancy > 50 
                ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-400/30'
                : 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-400/30'
            }`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 transition-colors duration-200 ${
                  stats.overallOccupancy > 85 
                    ? 'bg-red-500 dark:bg-red-400'
                    : stats.overallOccupancy > 70 
                    ? 'bg-amber-500 dark:bg-amber-400'
                    : stats.overallOccupancy > 50 
                    ? 'bg-blue-500 dark:bg-blue-400'
                    : 'bg-emerald-500 dark:bg-emerald-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 transition-colors duration-200 ${
                  stats.overallOccupancy > 85 
                    ? 'bg-red-600 dark:bg-red-500'
                    : stats.overallOccupancy > 70 
                    ? 'bg-amber-600 dark:bg-amber-500'
                    : stats.overallOccupancy > 50 
                    ? 'bg-blue-600 dark:bg-blue-400'
                    : 'bg-emerald-600 dark:bg-emerald-400'
                }`}></span>
              </span>
              {stats.overallOccupancy > 85 ? 'Kritik Seviye - Acil Genişleme Gerekli' :
               stats.overallOccupancy > 70 ? 'Yüksek Doluluk - Dikkat Edilmeli' :
               stats.overallOccupancy > 50 ? 'Orta Seviye - Normal Doluluk' :
               'Optimal Seviye - Yeterli Kapasite'}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white transition-colors duration-300">İşlem Grafiği</h3>
          <select
            value={String(yearFilter)}
            onChange={(e) => setYearFilter(e.target.value === 'last12' ? 'last12' : Number(e.target.value))}
            className="p-2 rounded-md bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors duration-300"
          >
            <option value="last12">Son 12 Ay</option>
            {stats.availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={stats.monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEklenen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme === 'dark' ? "#3B82F6" : "#8884d8"} stopOpacity={0.8} />
                <stop offset="95%" stopColor={theme === 'dark' ? "#3B82F6" : "#8884d8"} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCikan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme === 'dark' ? "#10B981" : "#82ca9d"} stopOpacity={0.8} />
                <stop offset="95%" stopColor={theme === 'dark' ? "#10B981" : "#82ca9d"} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorImha" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme === 'dark' ? "#F59E0B" : "#FD7E14"} stopOpacity={0.8} />
                <stop offset="95%" stopColor={theme === 'dark' ? "#F59E0B" : "#FD7E14"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "rgba(100, 116, 139, 0.3)" : "rgba(200, 200, 200, 0.3)"} />
            <XAxis dataKey="name" stroke={theme === 'dark' ? "rgb(148 163 184)" : "rgb(156 163 175)"} />
            <YAxis stroke={theme === 'dark' ? "rgb(148 163 184)" : "rgb(156 163 175)"} />
            <Tooltip content={<CustomAreaChartTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="Eklenen Klasör" stroke={theme === 'dark' ? "#3B82F6" : "#8884d8"} fillOpacity={1} fill="url(#colorEklenen)" />
            <Area type="monotone" dataKey="Çıkan Klasör" stroke={theme === 'dark' ? "#10B981" : "#82ca9d"} fillOpacity={1} fill="url(#colorCikan)" />
            <Area type="monotone" dataKey="İmha Edilen Klasör" stroke={theme === 'dark' ? "#F59E0B" : "#FD7E14"} fillOpacity={1} fill="url(#colorImha)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Full Width Location Analysis */}
      <div className="dashboard-card">
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>}>
          <LocationAnalysis 
            folders={analysisFolders}
            settings={settings}
            storageStructure={storageStructure}
            isLoading={isAnalysisLoading}
          />
        </Suspense>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-card" style={{ cursor: 'default' }}>
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>}>
          <RecentActivityList logs={logs} />
        </Suspense>
      </div>
    </div>
  );
};

export default Dashboard;