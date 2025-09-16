
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useArchive } from '@/context/ArchiveContext';
import { DashboardCard } from '@/components/DashboardCard';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Treemap, AreaChart, Area, Sector, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Folder, FileText, AlertTriangle, ChevronsRight, BookX, HardDrive, RotateCcw, Trash2, Loader2 } from 'lucide-react';
import { Category, CheckoutStatus, FolderStatus, Log, StorageType, Folder as FolderType, Settings, StorageStructure } from '@/types';
import { LocationAnalysis } from '../components/dashboard/LocationAnalysis';
import { RecentActivityList } from '../components/dashboard/RecentActivityList';
import { CustomAreaChartTooltip, CustomizedTreemapContent, CustomPieTooltip, CustomTreemapTooltip } from '../components/dashboard/DashboardCharts';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/lib/toast';
import * as api from '@/api';

const API_BASE = (process.env as any).API_BASE;
const localApi = (p: string) => `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;

const basename = (p?: string) => (p ? p.split(/[\\/]/).pop() : undefined);

const initialStats = {
  totalFolders: 0,
  tibbiCount: 0,
  idariCount: 0,
  cikisBekleyenCount: 0,
  iadeGecikenCount: 0,
  imhaBekleyenCount: 0,
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

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
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

  const [theme] = useTheme();
  const [pieActiveIndex, setPieActiveIndex] = useState(0);
  const [isPieHovered, setIsPieHovered] = useState(false);
  const [treemapFilter, setTreemapFilter] = useState<'all' | StorageType.Kompakt | StorageType.Stand>('all');
  const [yearFilter, setYearFilter] = useState<'last12' | number>('last12');
  
  const [stats, setStats] = useState(initialStats);
  const [isLoading, setIsLoading] = useState(true);

  const [analysisFolders, setAnalysisFolders] = useState<Partial<FolderType>[]>([]);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true);

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
      const params = new URLSearchParams({
        treemapFilter: treemap,
        yearFilter: String(year),
      });
      const res = await fetch(localApi(`/dashboard-stats?${params.toString()}`));
      if (!res.ok) throw new Error('İstatistikler alınamadı');
      const data = await res.json();
      setStats(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchStats(treemapFilter, yearFilter);
  }, [treemapFilter, yearFilter, fetchStats]);

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
    { name: 'Dolu', value: stats.overallOccupancy },
    { name: 'Boş', value: 100 - stats.overallOccupancy },
  ];
  const PIE_COLORS = ['#0078D4', '#E5F3FF'];
  
  const SUNBURST_COLORS = [
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-6">
        <div onClick={() => onNavigate('Tüm Klasörler')} className="cursor-pointer">
          <DashboardCard title="Toplam Klasör" value={stats.totalFolders} icon={Folder} color="#007BFF" />
        </div>
        <div onClick={() => onNavigate('Arama', { category: Category.Tibbi })} className="cursor-pointer">
          <DashboardCard title="Tıbbi" value={stats.tibbiCount} icon={FileText} color="#28A745" />
        </div>
        <div onClick={() => onNavigate('Arama', { category: Category.Idari })} className="cursor-pointer">
          <DashboardCard title="İdari" value={stats.idariCount} icon={FileText} color="#17A2B8" />
        </div>
        <div onClick={() => onNavigate('Çıkış/İade Takip')} className="cursor-pointer">
          <DashboardCard title="Çıkış Bekleyen" value={stats.cikisBekleyenCount} icon={ChevronsRight} color="#FFC107" />
        </div>
        <div onClick={() => onNavigate('Çıkış/İade Takip')} className="cursor-pointer">
          <DashboardCard title="İade Geciken" value={stats.iadeGecikenCount} icon={AlertTriangle} color="#DC3545" />
        </div>
        <div onClick={() => onNavigate('İmha', { tab: 'disposable' })} className="cursor-pointer">
          <DashboardCard title="İmha Bekleyen" value={stats.imhaBekleyenCount} icon={BookX} color="#FD7E14" />
        </div>
        <div onClick={() => onNavigate('İmha', { tab: 'disposed' })} className="cursor-pointer">
          <DashboardCard title="İmha Edilen" value={stats.imhaEdilenCount} icon={Trash2} color="#6c757d" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="relative bg-white dark:bg-archive-dark-panel p-5 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive size={18} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-gray-800 dark:text-white">Son Yedekleme</h3>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <span className={`inline-block w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              canlı
            </span>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-200">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {finalLastBackup?.label || '—'}
              </span>
              <span>{finalLastBackup?.ts ? finalLastBackup.ts.toLocaleString() : '—'}</span>
            </div>
            {finalLastBackup?.details && (
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 break-words">{finalLastBackup.details}</div>
            )}
          </div>
        </div>

        <div className="relative bg-white dark:bg-archive-dark-panel p-5 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:z-10">
          <div className="flex items-center gap-2 mb-2">
            <RotateCcw size={18} className="text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">Son Geri Yükleme</h3>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-200">
             <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {finalLastRestore?.label || '—'}
              </span>
              <span>{finalLastRestore?.ts ? finalLastRestore.ts.toLocaleString() : '—'}</span>
            </div>
            {finalLastRestore?.details && (
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 break-words">{finalLastRestore.details}</div>
            )}
          </div>
        </div>

        <div className="relative bg-white dark:bg-archive-dark-panel p-5 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:z-10">
          <div className="flex items-center gap-2 mb-2">
            <BookX size={18} className="text-rose-600 dark:text-rose-400" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">Eski Yedek Temizliği</h3>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-200">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                {finalLastCleanup?.label || '—'}
              </span>
              <span>{finalLastCleanup?.ts ? new Date(finalLastCleanup.ts).toLocaleString() : '—'}</span>
            </div>
             {finalLastCleanup?.details && (
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 break-words">{finalLastCleanup.details}</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-archive-dark-panel p-6 rounded-xl shadow-lg transition-colors duration-300">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-archive-dark-panel p-6 rounded-xl shadow-lg transition-colors duration-300">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 transition-colors duration-300">
            Tıbbi Kayıtların Klinik Dağılımı
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={stats.clinicDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={120} fill="#8884d8" paddingAngle={2}>
                {stats.clinicDistributionData.map((entry: any, index: number) => (
                  <Cell key={`cell-clinic-${index}`} fill={SUNBURST_COLORS[index % SUNBURST_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-archive-dark-panel p-6 rounded-xl shadow-lg flex flex-col justify-center items-center transition-colors duration-300">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 w-full text-center transition-colors duration-300">Genel Doluluk Oranı</h3>
          <div className="relative w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  // @ts-ignore - recharts versiyonuna göre tip farkı olabiliyor
                  activeIndex={pieActiveIndex}
                  activeShape={(props: any) => <Sector {...props} cornerRadius={5} />}
                  inactiveShape={(props: any) => <Sector {...props} cornerRadius={5} />}
                >
                  {occupancyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ display: 'none' }} cursor={{ fill: 'transparent' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
              <span className="text-3xl font-bold text-gray-800 dark:text-white transition-colors duration-300">
                {`${(occupancyData[pieActiveIndex].value as number).toFixed(2)}%`}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">{occupancyData[pieActiveIndex].name}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-archive-dark-panel p-6 rounded-xl shadow-lg transition-colors duration-300">
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
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCikan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorImha" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FD7E14" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#FD7E14" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(200, 200, 200, 0.3)" />
            <XAxis dataKey="name" stroke="rgb(156 163 175)" />
            <YAxis stroke="rgb(156 163 175)" />
            <Tooltip content={<CustomAreaChartTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="Eklenen Klasör" stroke="#8884d8" fillOpacity={1} fill="url(#colorEklenen)" />
            <Area type="monotone" dataKey="Çıkan Klasör" stroke="#82ca9d" fillOpacity={1} fill="url(#colorCikan)" />
            <Area type="monotone" dataKey="İmha Edilen Klasör" stroke="#FD7E14" fillOpacity={1} fill="url(#colorImha)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LocationAnalysis 
          folders={analysisFolders}
          settings={settings}
          storageStructure={storageStructure}
          isLoading={isAnalysisLoading}
        />
        <RecentActivityList logs={logs} />
      </div>
    </div>
  );
};
