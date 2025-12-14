import React, { useState, useEffect, useMemo } from 'react';
import '@/styles/liquid-gauge.css';
import { useArchive } from '@/context/ArchiveContext';
import { LocationAnalysis } from './components/LocationAnalysis';
import { RecentActivityList } from './components/RecentActivityList';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Treemap, Sector } from 'recharts';
import { Folder, FileText, AlertTriangle, ChevronsRight, BookX, HardDrive, RotateCcw, Trash2, Loader2, Calendar, Clock } from 'lucide-react';
import { StorageType } from '@/types';
import { CustomPieTooltip, CustomTreemapTooltip, CustomizedTreemapContent } from './utils/chartHelpers';
import { useTheme } from '@/hooks/useTheme';
import { getCardIconColor, getOccupancyColor, getOccupancyTextClass, THEME_COLORS, getChartColors } from '@/lib/theme';
import '@/styles/dashboard-grid.css';
import { DEFAULT_SETTINGS, INITIAL_STORAGE_STRUCTURE } from '@/constants';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCountUp } from '@/hooks/useCountUp';

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

  // Animation states
  const animatedOccupancy = useCountUp(stats.overallOccupancy, 2000, 1);
  const [gaugeValue, setGaugeValue] = useState(0);

  // Trigger gauge animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setGaugeValue(stats.overallOccupancy);
    }, 100);
    return () => clearTimeout(timer);
  }, [stats.overallOccupancy]);

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
    // Use animating gaugeValue for dashArray
    const dashArray = `${(gaugeValue / 100) * 264} 264`;
    
    return { bgColor, progressColor, dashArray };
  }, [theme, stats.overallOccupancy, gaugeValue]);
  
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
  // Pie chart interaction logic
  useEffect(() => {
    if (isPieHovered) return;
    const interval = setInterval(() => {
      setPieActiveIndex((prevIndex) => {
         const len = stats.clinicDistributionData.length || 1;
         return (prevIndex + 1) % len;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [isPieHovered, stats.clinicDistributionData.length]);

  const SUNBURST_COLORS = getChartColors('sunburst');

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <text x={cx} y={cy} dy={-10} textAnchor="middle" fill={theme === 'dark' ? '#fff' : '#333'} className="text-xl font-bold">
            {value}
        </text>
        <text x={cx} y={cy} dy={15} textAnchor="middle" fill={theme === 'dark' ? '#aaa' : '#666'} className="text-xs">
            {payload.name && payload.name.length > 15 ? payload.name.substring(0, 12) + '...' : payload.name}
        </text>
      </g>
    );
  };

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
        <div className="flex space-x-2 border-b border-gray-200 dark:border-slate-600 mb-4 transition-colors duration-300">
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
          <Treemap 
            data={stats.treemapData} 
            dataKey="size" 
            isAnimationActive={true} 
            animationDuration={400}
            content={<CustomizedTreemapContent theme={theme} />}
          >
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
                activeIndex={pieActiveIndex}
                activeShape={renderActiveShape}
                onMouseEnter={(_, index) => { setIsPieHovered(true); setPieActiveIndex(index); }}
                onMouseLeave={() => setIsPieHovered(false)}
              >
                {stats.clinicDistributionData.map((entry: any, index: number) => (
                  <Cell key={`cell-clinic-${index}`} fill={SUNBURST_COLORS[index % SUNBURST_COLORS.length]} />
                ))}
              </Pie>
              <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Arşiv Doluluk Durumu */}
        <div className="dashboard-card relative overflow-hidden flex flex-col items-center justify-between" style={{ cursor: 'default' }}>
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-2 text-center w-full">
            Arşiv Doluluk Durumu
          </h3>
          
          <div className="flex flex-col items-center gap-4 py-2 w-full flex-1 justify-center">
            {/* Circular Progress Chart */}
            <div className="relative" style={{ width: '160px', height: '160px' }}>
              <svg 
                className="transform -rotate-90 drop-shadow-lg" 
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
                  className="opacity-30"
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
                  style={{ transition: 'stroke-dasharray 2s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                />
              </svg>
              
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in duration-1000">
                <div className={`text-base xl:text-lg font-bold leading-none mb-1 ${getOccupancyTextClass(theme, stats.overallOccupancy)}`}>
                  {animatedOccupancy}%
                </div>
                <div className={`text-[10px] xl:text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Dolu
                </div>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div key={`stats-${theme}`} className="grid grid-cols-2 gap-3 w-full max-w-sm px-4">
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600/50 transition-colors duration-200">
                <div className="flex flex-col items-center justify-center text-center gap-0.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className={`w-2 h-2 rounded-full ${
                      stats.overallOccupancy > 85 ? 'bg-red-500' : 
                      stats.overallOccupancy > 70 ? 'bg-amber-500' : 
                      stats.overallOccupancy > 50 ? 'bg-teal-500' : 'bg-emerald-500'
                    }`}></div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Dolu Alan</span>
                  </div>
                  <div className="text-sm xl:text-base font-bold text-gray-800 dark:text-gray-100">
                    {animatedOccupancy}%
                  </div>
                </div>
              </div>
              
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600/50 transition-colors duration-200">
                <div className="flex flex-col items-center justify-center text-center gap-0.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-slate-500"></div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Boş Alan</span>
                  </div>
                  <div className="text-sm xl:text-base font-bold text-gray-800 dark:text-gray-100">
                    {(100 - parseFloat(animatedOccupancy)).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status Badge */}
            <div key={`badge-${theme}-${stats.overallOccupancy}`} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] xl:text-xs font-medium transition-colors duration-200 mt-1 ${
              stats.overallOccupancy > 85 
                ? 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-400/30'
                : stats.overallOccupancy > 70 
                ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-200 border border-amber-200 dark:border-amber-400/30'
                : stats.overallOccupancy > 50 
                ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-400/30'
                : 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-400/30'
            }`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  stats.overallOccupancy > 85 ? 'bg-red-500' : 
                  stats.overallOccupancy > 70 ? 'bg-amber-500' : 
                  stats.overallOccupancy > 50 ? 'bg-teal-500' : 'bg-emerald-500'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  stats.overallOccupancy > 85 ? 'bg-red-600' : 
                  stats.overallOccupancy > 70 ? 'bg-amber-600' : 
                  stats.overallOccupancy > 50 ? 'bg-teal-600' : 'bg-emerald-600'
                }`}></span>
              </span>
              {stats.overallOccupancy > 85 ? 'Kritik Seviye' :
               stats.overallOccupancy > 70 ? 'Yüksek Doluluk' :
               stats.overallOccupancy > 50 ? 'Orta Seviye' :
               'Yeterli Kapasite'}
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
