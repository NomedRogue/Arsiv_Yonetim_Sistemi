
import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import '../styles/liquid-gauge.css';
import { useArchive } from '@/context/ArchiveContext';
import { DashboardCard } from '@/components/DashboardCard';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Treemap, AreaChart, Area, Sector, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Folder, FileText, AlertTriangle, ChevronsRight, BookX, HardDrive, RotateCcw, Trash2, Loader2, Calendar, Clock } from 'lucide-react';
import { Category, CheckoutStatus, FolderStatus, Log, StorageType, Folder as FolderType, Settings, StorageStructure, DashboardStats } from '@/types';
import { CustomAreaChartTooltip, CustomizedTreemapContent, CustomPieTooltip, CustomTreemapTooltip } from '../components/dashboard/DashboardCharts';
import { useTheme } from '@/hooks/useTheme';
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
    lastBackupEvent,
    lastRestoreEvent,
    lastBackupCleanupEvent,
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
  
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [isLoading, setIsLoading] = useState(true);

  const [analysisFolders, setAnalysisFolders] = useState<Partial<FolderType>[]>([]);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true);

  // Dashboard cards data
  const dashboardCardsData = useMemo(() => [
    { title: "Toplam Klasör", value: stats.totalFolders, icon: Folder, color: "#007BFF", onClick: () => onNavigate('Tüm Klasörler') },
    { title: "Tıbbi", value: stats.tibbiCount, icon: FileText, color: "#28A745", onClick: () => onNavigate('Arama', { category: Category.Tibbi }) },
    { title: "İdari", value: stats.idariCount, icon: FileText, color: "#17A2B8", onClick: () => onNavigate('Arama', { category: Category.Idari }) },
    { title: "Arşiv Dışında", value: stats.arsivDisindaCount, icon: ChevronsRight, color: "#FFC107", onClick: () => onNavigate('Çıkış/İade Takip') },
    { title: "İade Geciken", value: stats.iadeGecikenCount, icon: AlertTriangle, color: "#DC3545", onClick: () => onNavigate('Çıkış/İade Takip') },
    { title: "Bu Yıl İmha Edilecekler", value: stats.buYilImhaEdilenecekCount, icon: BookX, color: "#FD7E14", onClick: () => onNavigate('İmha', { tab: 'disposable', filter: 'thisYear' }) },
    { title: "Gelecek Yıl İmha Edilecekler", value: stats.gelecekYilImhaEdilenecekCount, icon: Calendar, color: "#FF6B35", onClick: () => onNavigate('İmha', { tab: 'disposable', filter: 'nextYear' }) },
    { title: "İmha Süresi Geçenler", value: stats.imhaSuresiGecenCount, icon: Clock, color: "#E74C3C", onClick: () => onNavigate('İmha', { tab: 'disposable', filter: 'overdue' }) },
    { title: "İmha Edilen", value: stats.imhaEdilenCount, icon: Trash2, color: "#6c757d", onClick: () => onNavigate('İmha', { tab: 'disposed' }) }
  ], [stats, onNavigate]);

  useEffect(() => {
    const fetchAnalysisData = async () => {
      setIsAnalysisLoading(true);
      try {
        const folders = await api.getAllFoldersForAnalysis();
        setAnalysisFolders(folders);
      } catch (error: any) {
        toast.error(`Analiz verileri alınamadı: ${error.message}`);
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
      toast.error(error.message || 'İstatistikler alınamadı');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchStats(treemapFilter, yearFilter);
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

  const finalLastBackup = useMemo(() => {
    if (lastBackupEvent) {
        return {
            ts: lastBackupEvent.ts,
            details: `Yedek alındı (${lastBackupEvent.reason}). Dosya: ${basename(lastBackupEvent.path)}`,
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
        {dashboardCardsData.map((card, index) => (
          <div key={index} onClick={card.onClick} className="bg-white dark:bg-slate-700 rounded-lg p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer min-h-[80px] flex items-center border border-gray-200 dark:border-slate-600 shadow-sm dark:hover:shadow-slate-600/20">
            <div className="mr-3 flex-shrink-0" style={{ color: card.color }}>
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
        ))}
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
        <div className="dashboard-card relative overflow-hidden">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 text-center transition-colors duration-300">Genel Doluluk Oranı</h3>
          <div className="relative w-full h-[280px] flex items-center justify-center">
            {/* Animated Circle Chart */}
            <div className="relative w-64 h-64 flex items-center justify-center">
              {/* Background Circle */}
              <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                {/* Background Track */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}
                  strokeWidth="12"
                  className="transition-colors duration-300"
                />
                
                {/* Animated Progress Circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke={
                    stats.overallOccupancy > 80 ? '#ef4444' : 
                    stats.overallOccupancy > 60 ? '#f59e0b' : 
                    '#10b981'
                  }
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="534.07"
                  strokeDashoffset={Math.max(
                    534.07 - (Math.max(stats.overallOccupancy, 1.5) / 100) * 534.07,
                    534.07 - (1.5 / 100) * 534.07
                  )}
                  className="circle-progress transition-all duration-[2500ms] ease-out"
                  style={{
                    filter: `drop-shadow(0 0 15px ${
                      stats.overallOccupancy > 80 ? 'rgba(239, 68, 68, 0.3)' : 
                      stats.overallOccupancy > 60 ? 'rgba(245, 158, 11, 0.3)' : 
                      'rgba(16, 185, 129, 0.3)'
                    })`
                  }}
                />
              </svg>
              
              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
                {/* Main Percentage */}
                <div className={`text-4xl font-bold mb-3 transition-all duration-[2500ms] ease-out ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                } ${
                  stats.overallOccupancy > 80 ? 'text-red-600 dark:text-red-400' : 
                  stats.overallOccupancy > 60 ? 'text-amber-600 dark:text-amber-400' : 
                  'text-emerald-600 dark:text-emerald-400'
                }`}>
                  <span className="counter-animation">
                    {stats.overallOccupancy.toFixed(1)}
                  </span>%
                </div>
                
                {/* Status Badge */}
                <div className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium mb-3 transition-all duration-300 ${
                  stats.overallOccupancy > 80 ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' :
                  stats.overallOccupancy > 60 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' :
                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                }`}>
                  {stats.overallOccupancy > 80 ? 'Yüksek Doluluk' :
                   stats.overallOccupancy > 60 ? 'Orta Doluluk' : 'Normal Doluluk'}
                </div>
                
                {/* Empty Space Info */}
                <div className={`text-sm font-medium transition-colors duration-300 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {(100 - stats.overallOccupancy).toFixed(1)}% Boş Alan
                </div>
              </div>
              
              {/* Animated Pulse Effects - Removed for simplicity */}
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
      <div className="dashboard-card">
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>}>
          <RecentActivityList logs={logs} />
        </Suspense>
      </div>
    </div>
  );
};

export default Dashboard;