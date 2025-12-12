import React, { useState, useEffect, useMemo, useCallback } from 'react';
import '@/styles/liquid-gauge.css';
import { useArchive } from '@/context/ArchiveContext';
import { DashboardCard } from './components/DashboardCard';
import { LocationAnalysis } from './components/LocationAnalysis';
import { RecentActivityList } from './components/RecentActivityList';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Treemap } from 'recharts';
import { Folder, FileText, AlertTriangle, ChevronsRight, BookX, HardDrive, RotateCcw, Trash2, Loader2, Calendar, Clock } from 'lucide-react';
import { StorageType } from '@/types';
import { CustomPieTooltip, CustomTreemapTooltip, CustomizedTreemapContent } from './utils/chartHelpers';
import { useTheme } from '@/hooks/useTheme';
import { getCardIconColor, getOccupancyColor, getOccupancyTextClass, THEME_COLORS, getPieChartColors, getChartColors } from '@/lib/theme';
import '@/styles/dashboard-grid.css';
import { DEFAULT_SETTINGS, INITIAL_STORAGE_STRUCTURE } from '@/constants';
import { useDashboardStats } from '@/hooks/useDashboardStats';

const basename = (p?: string) => (p ? p.split(/[\\/]/).pop() : undefined);

interface DashboardProps {
  onNavigate: (page: string, params?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const {
    logs,
    settings,
    storageStructure,
    initialBackupLog,
    initialRestoreLog,
    initialCleanupLog,
    lastBackupEvent,
    lastRestoreEvent,
    lastBackupCleanupEvent,
  } = useArchive();

  const { theme } = useTheme();
  const [pieActiveIndex, setPieActiveIndex] = useState(0);
  const [isPieHovered, setIsPieHovered] = useState(false);
  const [treemapFilter, setTreemapFilter] = useState<'all' | StorageType.Kompakt | StorageType.Stand>('all');
  const [yearFilter, setYearFilter] = useState<'last12' | number>('last12');
  
  // Use Custom Hook for Business Logic & Data Fetching
  const { stats, isLoading, analysisFolders, isAnalysisLoading } = useDashboardStats(treemapFilter, yearFilter);

  // Dashboard cards data
  const dashboardCardsData = useMemo(() => [
    { title: "Toplam Klasör", value: stats.totalFolders, icon: Folder, onClick: () => onNavigate('Arşiv') },
    { title: "Tıbbi", value: stats.tibbiCount, icon: FileText, onClick: () => onNavigate('Arşiv') },
    { title: "İdari", value: stats.idariCount, icon: FileText, onClick: () => onNavigate('Arşiv') },
    { title: "Arşiv Dışında", value: stats.arsivDisindaCount, icon: ChevronsRight, onClick: () => onNavigate('Dosya Talep') },
    { title: "İade Geciken", value: stats.iadeGecikenCount, icon: AlertTriangle, onClick: () => onNavigate('Dosya Talep') },
    { title: "Bu Yıl İmha Edilecekler", value: stats.buYilImhaEdilenecekCount, icon: BookX, onClick: () => onNavigate('İmha', { tab: 'disposable', filter: 'thisYear' }) },
    { title: "Gelecek Yıl İmha Edilecekler", value: stats.gelecekYilImhaEdilenecekCount, icon: Calendar, onClick: () => onNavigate('İmha', { tab: 'disposable', filter: 'nextYear' }) },
    { title: "İmha Süresi Geçenler", value: stats.imhaSuresiGecenCount, icon: Clock, onClick: () => onNavigate('İmha', { tab: 'disposable', filter: 'overdue' }) },
    { title: "İmha Edilen", value: stats.imhaEdilenCount, icon: Trash2, onClick: () => onNavigate('İmha', { tab: 'disposed' }) }
  ], [stats, onNavigate]);

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

  // Occupancy gauge colors - properly reactive to theme changes
  const occupancyGaugeColors = useMemo(() => {
    const bgColor = THEME_COLORS[theme].occupancy.background;
    const progressColor = getOccupancyColor(theme, stats.overallOccupancy);
    const dashArray = `${(stats.overallOccupancy / 100) * 264} 264`;
    
    return { bgColor, progressColor, dashArray };
  }, [theme, stats.overallOccupancy]);
  
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
  
  // Pie chart interaction logic
  useEffect(() => {
    if (isPieHovered) return;
    const interval = setInterval(() => {
      setPieActiveIndex((prevIndex) => (prevIndex + 1) % 2);
    }, 10000);
    return () => clearInterval(interval);
  }, [isPieHovered]);

  const SUNBURST_COLORS = getChartColors('sunburst');

  if (isLoading && stats.totalFolders === 0) {
    return (
      <div className="p-6 flex justify-center items-center h-[calc(100vh-150px)]">
        <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-3 xl:p-5 space-y-3 xl:space-y-5">
      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-5 xl:grid-cols-9 gap-3 mb-5">
        {dashboardCardsData.map((card, index) => {
          const iconColor = getCardIconColor(theme, card.title);
          return (
            <div key={index} onClick={card.onClick} className="bg-white dark:bg-slate-700 rounded-lg p-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer min-h-[4rem] xl:min-h-[5rem] flex items-center border border-gray-200 dark:border-slate-600 shadow-sm dark:hover:shadow-slate-600/20">
              <div className="mr-2 flex-shrink-0 transition-colors duration-200" style={{ color: iconColor }}>
                <card.icon className="w-5 h-5 xl:w-6 xl:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 truncate">
                  {card.title}
                </h3>
                <span className="text-base xl:text-lg font-bold text-gray-900 dark:text-white">
                  {card.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Backup Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        {/* Backup Card */}
        <div className="bg-white dark:bg-slate-700 rounded-lg p-3 shadow-sm transition-colors duration-300 border border-gray-200 dark:border-slate-600">
          <div className="flex items-center">
            <HardDrive className="w-4 h-4 xl:w-5 xl:h-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs xl:text-sm font-semibold text-gray-800 dark:text-white mb-1">Son Yedekleme</h3>
              <span className="text-xs xl:text-sm px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                {finalLastBackup?.label || '—'}
              </span>
              <div className="text-xs xl:text-sm text-gray-500 dark:text-gray-400 mt-1">
                {finalLastBackup?.ts ? finalLastBackup.ts.toLocaleString() : '—'}
              </div>
              {finalLastBackup?.details && (
                <div className="text-xs xl:text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {finalLastBackup.details}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Restore Card */}
        <div className="bg-white dark:bg-slate-700 rounded-lg p-3 shadow-sm transition-colors duration-300 border border-gray-200 dark:border-slate-600">
          <div className="flex items-center">
            <RotateCcw className="w-4 h-4 xl:w-5 xl:h-5 text-amber-600 dark:text-amber-400 mr-2 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs xl:text-sm font-semibold text-gray-800 dark:text-white mb-1">Son Geri Yükleme</h3>
              <span className="text-xs xl:text-sm px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {finalLastRestore?.label || '—'}
              </span>
              <div className="text-xs xl:text-sm text-gray-500 dark:text-gray-400 mt-1">
                {finalLastRestore?.ts ? finalLastRestore.ts.toLocaleString() : '—'}
              </div>
              {finalLastRestore?.details && (
                <div className="text-xs xl:text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {finalLastRestore.details}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cleanup Card */}
        <div className="bg-white dark:bg-slate-700 rounded-lg p-3 shadow-sm transition-colors duration-300 border border-gray-200 dark:border-slate-600">
          <div className="flex items-center">
            <Trash2 className="w-4 h-4 xl:w-5 xl:h-5 text-rose-600 dark:text-rose-400 mr-2 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs xl:text-sm font-semibold text-gray-800 dark:text-white mb-1">Eski Yedek Temizliği</h3>
              <span className="text-xs xl:text-sm px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                {finalLastCleanup?.label || '—'}
              </span>
              <div className="text-xs xl:text-sm text-gray-500 dark:text-gray-400 mt-1">
                {finalLastCleanup?.ts ? new Date(finalLastCleanup.ts).toLocaleString() : '—'}
              </div>
              {finalLastCleanup?.details && (
                <div className="text-xs xl:text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {finalLastCleanup.details}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <h3 className="text-sm xl:text-base font-bold text-gray-800 dark:text-white mb-2 transition-colors duration-300">Arşiv Dağılımı</h3>
        <div className="flex space-x-2 border-b dark:border-gray-700 mb-4 transition-colors duration-300">
          <button
            onClick={() => setTreemapFilter('all')}
            className={`px-3 py-2 text-xs xl:text-sm font-medium transition-colors duration-300 ${
              treemapFilter === 'all' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setTreemapFilter(StorageType.Kompakt)}
            className={`px-3 py-2 text-xs xl:text-sm font-medium transition-colors duration-300 ${
              treemapFilter === StorageType.Kompakt ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Kompakt Dolap
          </button>
          <button
            onClick={() => setTreemapFilter(StorageType.Stand)}
            className={`px-3 py-2 text-xs xl:text-sm font-medium transition-colors duration-300 ${
              treemapFilter === StorageType.Stand ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 dark:text-gray-400'
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
          <h3 className="text-sm xl:text-base font-bold text-gray-800 dark:text-white mb-3 transition-colors duration-300">
            Tıbbi Kayıtların Klinik Dağılımı
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie 
                data={stats.clinicDistributionData} 
                dataKey="value" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                innerRadius={60} 
                outerRadius={110} 
                fill="#8884d8" 
                paddingAngle={2}
                onMouseEnter={(_, index) => { setIsPieHovered(true); setPieActiveIndex(index); }}
                onMouseLeave={() => setIsPieHovered(false)}
              >
                {stats.clinicDistributionData.map((entry: any, index: number) => (
                  <Cell key={`cell-clinic-${index}`} fill={SUNBURST_COLORS[index % SUNBURST_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Arşiv Doluluk Durumu */}
        <div className="dashboard-card relative overflow-hidden" style={{ cursor: 'default' }}>
          <h3 className="text-sm xl:text-base font-bold text-gray-800 dark:text-white mb-6 text-center">
            Arşiv Doluluk Durumu
          </h3>
          
          <div className="flex flex-col items-center gap-6 py-3">
            {/* Circular Progress Chart */}
            <div className="relative" style={{ width: '220px', height: '220px' }}>
              <svg 
                className="transform -rotate-90" 
                viewBox="0 0 100 100" 
                style={{ width: '100%', height: '100%' }}
              >
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={occupancyGaugeColors.bgColor}
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={occupancyGaugeColors.progressColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={occupancyGaugeColors.dashArray}
                  style={{ transition: 'stroke 0.3s ease, stroke-dasharray 0.5s ease' }}
                />
              </svg>
              
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-4xl xl:text-5xl font-bold leading-none mb-2 ${getOccupancyTextClass(theme, stats.overallOccupancy)}`}>
                  {stats.overallOccupancy.toFixed(1)}%
                </div>
                <div className={`text-xs xl:text-sm font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Dolu
                </div>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div key={`stats-${theme}`} className="grid grid-cols-2 gap-6 w-full max-w-md">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-700/70 border border-gray-300 dark:border-slate-600/70 shadow-sm transition-colors duration-200">
                <div className="flex flex-col items-center justify-center text-center gap-1">
                  <div key={`dot-filled-${theme}-${stats.overallOccupancy}`} className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mb-1 transition-colors duration-200 ${
                    stats.overallOccupancy > 85 
                      ? 'bg-red-500 dark:bg-red-400'
                      : stats.overallOccupancy > 70 
                      ? 'bg-amber-500 dark:bg-amber-400'
                      : stats.overallOccupancy > 50 
                      ? 'bg-teal-500 dark:bg-teal-400'
                      : 'bg-emerald-500 dark:bg-emerald-400'
                  }`}></div>
                  <div>
                    <div className="text-[0.65rem] xl:text-xs mb-0.5 text-gray-600 dark:text-gray-300 transition-colors duration-200">
                      Dolu Alan
                    </div>
                    <div className="text-lg xl:text-xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-200">
                      {stats.overallOccupancy.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-3 rounded-xl bg-white dark:bg-slate-700/70 border border-gray-300 dark:border-slate-600/70 shadow-sm transition-colors duration-200">
                <div className="flex flex-col items-center justify-center text-center gap-1">
                  <div key={`dot-empty-${theme}`} className="w-2.5 h-2.5 rounded-full flex-shrink-0 mb-1 bg-gray-500 dark:bg-slate-400 transition-colors duration-200"></div>
                  <div>
                    <div className="text-[0.65rem] xl:text-xs mb-0.5 text-gray-600 dark:text-gray-300 transition-colors duration-200">
                      Boş Alan
                    </div>
                    <div className="text-lg xl:text-xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-200">
                      {(100 - stats.overallOccupancy).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status Badge */}
            <div key={`badge-${theme}-${stats.overallOccupancy}`} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs xl:text-sm font-medium transition-colors duration-200 ${
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
                    ? 'bg-teal-500 dark:bg-teal-400'
                    : 'bg-emerald-500 dark:bg-emerald-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 transition-colors duration-200 ${
                  stats.overallOccupancy > 85 
                    ? 'bg-red-600 dark:bg-red-500'
                    : stats.overallOccupancy > 70 
                    ? 'bg-amber-600 dark:bg-amber-500'
                    : stats.overallOccupancy > 50 
                    ? 'bg-teal-600 dark:bg-teal-400'
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

      {/* İmha Takvimi - Compact Disposal Schedule */}
      <div className="dashboard-card">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-md bg-gradient-to-br from-red-500 to-orange-500">
              <Trash2 className="w-3 h-3 text-white" />
            </div>
            <h3 className="text-xs xl:text-sm font-bold text-gray-800 dark:text-white">İmha Takvimi</h3>
          </div>
          <div className="flex items-center gap-3 text-[10px] xl:text-xs text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
              Gecikmiş
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
              Bu Yıl
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-slate-500"></div>
              Gelecek
            </span>
          </div>
        </div>
        
        {/* Compact Disposal Schedule Grid */}
        <div className="space-y-1.5">
          {stats.disposalSchedule.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-gray-400 dark:text-gray-500 text-xs">
              <div className="text-center">
                <Calendar className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p>Veri bulunamadı</p>
              </div>
            </div>
          ) : (
            stats.disposalSchedule.map((item, index) => {
              const maxCount = Math.max(...stats.disposalSchedule.map(d => d.count), 1);
              const percentage = (item.count / maxCount) * 100;
              
              const getBarColor = () => {
                if (item.isOverdue) return 'from-red-500 to-red-400';
                if (item.isCurrentYear) return 'from-orange-500 to-amber-400';
                return 'from-gray-400 to-gray-300 dark:from-teal-600 dark:to-teal-500';
              };
              
              return (
                <div 
                  key={item.year}
                  className={`flex items-center gap-2 p-1.5 rounded-md text-xs transition-colors ${
                    item.isOverdue ? 'bg-red-50 dark:bg-red-500/10 border border-transparent dark:border-red-500/20' : 
                    item.isCurrentYear ? 'bg-orange-50 dark:bg-orange-500/10 border border-transparent dark:border-orange-500/20' : 
                    'hover:bg-gray-100 dark:hover:bg-slate-500/30 border border-transparent'
                  }`}
                >
                  <div className={`w-16 font-medium flex items-center gap-1 ${
                    item.isOverdue ? 'text-red-600 dark:text-red-300' : 
                    item.isCurrentYear ? 'text-orange-600 dark:text-orange-300' : 
                    'text-gray-600 dark:text-gray-300'
                  }`}>
                    {item.isOverdue && <AlertTriangle className="w-3 h-3" />}
                    {item.label || item.year}
                  </div>
                  
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${getBarColor()} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(percentage, item.count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                  
                  <div className={`w-12 text-right font-semibold ${
                    item.isOverdue ? 'text-red-600 dark:text-red-400' : 
                    item.isCurrentYear ? 'text-orange-600 dark:text-orange-400' : 
                    'text-gray-700 dark:text-gray-300'
                  }`}>
                    {item.count}
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {stats.disposalSchedule.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center text-xs">
            <span className="text-gray-500 dark:text-gray-400">Toplam:</span>
            <span className="font-bold text-gray-800 dark:text-white">
              {stats.disposalSchedule.reduce((sum, d) => sum + d.count, 0)} klasör
            </span>
          </div>
        )}
      </div>

      <div className="dashboard-card">
        <LocationAnalysis 
          folders={analysisFolders}
          settings={settings || DEFAULT_SETTINGS}
          storageStructure={storageStructure || INITIAL_STORAGE_STRUCTURE}
          isLoading={isAnalysisLoading}
        />
      </div>

      <div className="dashboard-card" style={{ cursor: 'default' }}>
        <RecentActivityList logs={logs} />
      </div>
    </div>
  );
};
