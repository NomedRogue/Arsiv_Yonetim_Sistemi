import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { StorageType, DetailedOccupancyItem, Folder, Settings, StorageStructure, Location, FolderType, FolderStatus, OccupancyInfo, Category } from '@/types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { FolderDetailModal } from './FolderDetailModal';
import { useTheme } from '@/hooks/useTheme';
import * as api from '@/api';
import { toast } from '@/lib/toast';
import { useArchive } from '@/context/ArchiveContext';

const safeNumber = (value: string | number | undefined): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const strVal = String(value).replace(',', '.');
  const num = parseFloat(strVal);
  return isNaN(num) ? 0 : num;
};

const getOccupancyColor = (percentage: number, isDark: boolean = false) => {
  if (percentage > 80) {
    return isDark ? 'bg-red-500' : 'bg-red-600';
  }
  if (percentage > 50) {
    return isDark ? 'bg-yellow-400' : 'bg-yellow-500';
  }
  return isDark ? 'bg-green-400' : 'bg-green-500';
};

interface ViewState {
  level: 'summary' | 'unit' | 'section';
  type?: StorageType;
  id?: number;
  name?: string;
  parent?: {
    unitId: number;
    faceName: string;
  };
}

// Yeni: Genişleyen raf görünümü için iç bileşen
const ExpandedShelfView: React.FC<{
    location: Location;
    settings: Settings;
    getDepartmentName: (id: number) => string;
}> = ({ location, settings, getDepartmentName }) => {
    const [folders, setFolders] = useState<Folder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
    const { sseConnected } = useArchive();

    const fetchFolders = useCallback(async () => {
        setIsLoading(true);
        try {
            const shelfFolders = await api.getFoldersByLocation(location);
            setFolders(shelfFolders);
        } catch (error: any) {
            // Sadece gerçek hataları göster, boş veri durumunu değil
            if (error.message && !error.message.includes('Failed to fetch')) {
                toast.error(`Raf içeriği alınamadı: ${error.message}`);
            }
            setFolders([]);
        } finally {
            setIsLoading(false);
        }
    }, [location]);

    useEffect(() => {
        fetchFolders();
    }, [fetchFolders]);
    
    // SSE bağlantısı değiştiğinde otomatik refresh
    useEffect(() => {
        if (sseConnected) {
            fetchFolders();
        }
    }, [sseConnected, fetchFolders]);

    const handleFolderClick = (folder: Folder) => {
        setSelectedFolder(folder);
        setDetailModalOpen(true);
    };

    const shelfWidth = location?.storageType === 'Kompakt' ? safeNumber(settings.kompaktRafGenisligi) : safeNumber(settings.standRafGenisligi);
    const usedSpace = folders.reduce((acc, f) => acc + (f.folderType === FolderType.Dar ? safeNumber(settings.darKlasorGenisligi) : safeNumber(settings.genisKlasorGenisligi)), 0);
    const remainingSpace = shelfWidth - usedSpace;

    return (
        <>
            <FolderDetailModal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                folder={selectedFolder}
                getDepartmentName={getDepartmentName}
            />
            <div className="p-4 pt-8 bg-gray-100 dark:bg-slate-800 rounded-lg my-2 mx-2">
                {isLoading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="animate-spin w-6 h-6 text-teal-500" />
                    </div>
                ) : (
                    <>
                        <div className="w-full h-28 bg-gray-200 dark:bg-slate-700 rounded-md flex items-end p-1 gap-px border border-gray-300 dark:border-slate-600">
                            {folders.map((folder) => {
                                const folderWidth = folder.folderType === FolderType.Dar ? safeNumber(settings.darKlasorGenisligi) : safeNumber(settings.genisKlasorGenisligi);
                                const widthPercent = shelfWidth > 0 ? (folderWidth / shelfWidth) * 100 : 0;
                                const colorClasses = folder.category === Category.Tibbi 
                                    ? 'bg-gradient-to-t from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 border-t-2 border-green-400' 
                                    : 'bg-gradient-to-t from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 border-t-2 border-blue-400';
                                
                                return (
                                    <div
                                        key={folder.id}
                                        className={`group relative h-full rounded-sm flex items-center justify-center text-white text-xs font-bold transition-colors duration-200 ${colorClasses}`}
                                        style={{ flexBasis: `${widthPercent}%`, cursor: 'pointer' }}
                                        onClick={() => handleFolderClick(folder)}
                                    >
                                        <div className="flex flex-col justify-between items-center h-full text-center p-1 leading-tight text-fluid-2xs font-normal text-shadow-sm">
                                            <span className="font-bold text-xs truncate">{folder.fileCode}</span>
                                            
                                            <div className="flex flex-col items-center">
                                                <span className="truncate">{folder.retentionPeriod} {folder.retentionCode}</span>
                                                <span className="truncate">{folder.fileCount}</span>
                                                <span className="truncate">{folder.fileYear}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-slate-800 dark:bg-slate-900 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                            <p className="font-bold truncate">{getDepartmentName(folder.departmentId)}</p>
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800 dark:border-t-slate-900"></div>
                                        </div>
                                    </div>
                                );
                            })}
                            {remainingSpace > 0 && shelfWidth > 0 && (
                                <div
                                    className="h-full bg-transparent flex-grow"
                                    style={{ flexBasis: `${(remainingSpace / shelfWidth) * 100}%` }}
                                />
                            )}
                        </div>
                        <div className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">
                            Dolu: {(usedSpace).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}cm / {shelfWidth.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}cm ({shelfWidth > 0 ? ((usedSpace/shelfWidth)*100).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}%)
                        </div>
                    </>
                )}
            </div>
        </>
    );
};


interface LocationAnalysisProps {
  folders: Partial<Folder>[];
  settings: Settings;
  storageStructure: StorageStructure;
  isLoading: boolean;
}

const LocationAnalysisInternal: React.FC<LocationAnalysisProps> = ({ folders, settings, storageStructure, isLoading }) => {
  const { getDepartmentName } = useArchive();
  const { theme } = useTheme();
  const [view, setView] = useState<ViewState>({ level: 'summary' });
  const [expandedShelfKey, setExpandedShelfKey] = useState<string | null>(null);



  const handleShelfClick = (key: string) => {
    setExpandedShelfKey(prevKey => (prevKey === key ? null : key));
  };

  const getOccupancy = useCallback(
    (location: Location): OccupancyInfo => {
      // Safety check
      if (!settings) return { total: 0, used: 0, percentage: 0, folders: [] };

      const foldersInLocation = folders.filter(f => {
          if (!f.location || f.status === FolderStatus.Imha) return false;
          if (f.location.storageType !== location.storageType) return false;

          if (location.storageType === StorageType.Kompakt) {
            return (
              f.location.unit === location.unit &&
              f.location.face === location.face &&
              f.location.section === location.section &&
              f.location.shelf === location.shelf
            );
          }
          
          if (location.storageType === StorageType.Stand) {
            return (
              f.location.stand === location.stand &&
              f.location.shelf === location.shelf
            );
          }
          
          return false;
      });
      const total = location.storageType === StorageType.Kompakt ? safeNumber(settings.kompaktRafGenisligi) : safeNumber(settings.standRafGenisligi);
      const used = foldersInLocation.reduce((acc, f) => acc + (f.folderType === FolderType.Dar ? safeNumber(settings.darKlasorGenisligi) : safeNumber(settings.genisKlasorGenisligi)), 0);
      return { total, used, percentage: total > 0 ? (used / total) * 100 : 0, folders: foldersInLocation as Folder[] };
    },
    [folders, settings]
  );

  // Sayı formatlama fonksiyonu (Türkçe formatı)
  const formatNumber = (num: number, digits: number = 0) => {
    return (num || 0).toLocaleString('tr-TR', { 
      minimumFractionDigits: digits, 
      maximumFractionDigits: digits 
    });
  };

  const summary = useMemo(() => {
    const kompakt: Record<string, number> = {};
    const stand: Record<string, number> = {};
    
    // Defensive: array kontrolü
    if (!settings || !storageStructure?.kompakt || !storageStructure?.stand) {
      return { kompakt, stand };
    }
    
    storageStructure.kompakt.forEach(u => {
      const foldersInUnit = folders.filter(f => f.location?.unit === u.unit && f.status !== FolderStatus.Imha);
      const totalSpace = u.faces.reduce((sum, face) => sum + face.sections.reduce((secSum, sec) => secSum + sec.shelves.length * safeNumber(settings.kompaktRafGenisligi), 0), 0);
      const usedSpace = foldersInUnit.reduce((sum, f) => sum + (f.folderType === FolderType.Dar ? safeNumber(settings.darKlasorGenisligi) : safeNumber(settings.genisKlasorGenisligi)), 0);
      kompakt[`Ünite ${u.unit}`] = totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0;
    });
    storageStructure.stand.forEach(s => {
      const foldersInStand = folders.filter(f => f.location?.stand === s.stand && f.status !== FolderStatus.Imha);
      const totalSpace = s.shelves.length * safeNumber(settings.standRafGenisligi);
      const usedSpace = foldersInStand.reduce((sum, f) => sum + (f.folderType === FolderType.Dar ? safeNumber(settings.darKlasorGenisligi) : safeNumber(settings.genisKlasorGenisligi)), 0);
      stand[`Stand ${s.stand}`] = totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0;
    });
    return { kompakt, stand };
  }, [folders, storageStructure, settings]);

  const detailedData: DetailedOccupancyItem[] = useMemo(() => {
    // Defensive: array kontrolü
    if (!settings || !storageStructure?.kompakt || !storageStructure?.stand) {
      return [];
    }
    
    if (view.level === 'unit' && view.type && view.id) {
        if (view.type === StorageType.Kompakt) {
            const unit = storageStructure.kompakt.find(u => u.unit === view.id);
            if (!unit) return [];
            return unit.faces.flatMap(face => face.sections.map(section => {
              const totalSpace = section.shelves.length * safeNumber(settings.kompaktRafGenisligi);
              const usedSpace = folders.filter(f => f.status !== FolderStatus.Imha && f.location?.unit === view.id && f.location?.face === face.name && f.location?.section === section.section)
                .reduce((sum, f) => sum + (f.folderType === FolderType.Dar ? safeNumber(settings.darKlasorGenisligi) : safeNumber(settings.genisKlasorGenisligi)), 0);
              return { name: `${face.name} - ${section.section}. Bölüm`, occupancy: totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0, faceName: face.name, sectionId: section.section };
            }));
          } else {
            const stand = storageStructure.stand.find(s => s.stand === view.id);
            if (!stand) return [];
            return stand.shelves.map(shelf => ({ name: `${shelf}. Raf`, occupancy: getOccupancy({ storageType: StorageType.Stand, stand: view.id, shelf }).percentage }));
          }
    }
    if (view.level === 'section' && view.parent && view.id) {
        const section = storageStructure.kompakt.find(u => u.unit === view.parent?.unitId)?.faces.find(f => f.name === view.parent?.faceName)?.sections.find(s => s.section === view.id);
        if (!section) return [];
        return section.shelves.map(shelf => ({ name: `${shelf}. Raf`, occupancy: getOccupancy({ storageType: StorageType.Kompakt, unit: view.parent?.unitId, face: view.parent?.faceName, section: view.id, shelf }).percentage }));
    }
    return [];
  }, [view, folders, settings, storageStructure, getOccupancy]);



  const handleSummaryClick = (type: StorageType, name: string) => {
    const id = parseInt(name.split(' ')[1]);
    setExpandedShelfKey(null);
    setView({ level: 'unit', type, id, name });
  };

  const handleUnitDetailClick = (item: DetailedOccupancyItem) => {
    if (view.type === StorageType.Kompakt && view.id && item.faceName && item.sectionId) {
      setExpandedShelfKey(null);
      setView({
        level: 'section',
        type: view.type,
        id: item.sectionId,
        name: item.name,
        parent: { unitId: view.id, faceName: item.faceName },
      });
    }
  };

  const handleBack = () => {
    setExpandedShelfKey(null);
    if (view.level === 'section') {
      setView({ level: 'unit', type: view.type, id: view.parent?.unitId, name: `Ünite ${view.parent?.unitId}` });
    } else {
      setView({ level: 'summary' });
    }
  };
  
  const renderTitle = () => {
    if (view.level === 'summary') return 'Lokasyon Doluluk Analizi';
    if (view.level === 'unit') return `${view.name} Detayları`;
    if (view.level === 'section') return `${view.name} Raf Detayları`;
    return '';
  };
  
  if (isLoading) {
    return (
      <div className="card-chart bg-white dark:bg-slate-800 shadow-lg flex justify-center items-center border border-gray-200 dark:border-slate-700">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-teal-500 mx-auto" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Lokasyon analizi yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (view.level !== 'summary') {
    return (
      <div className="card-chart bg-white dark:bg-slate-800 shadow-lg transition-colors duration-300 border border-gray-200 dark:border-slate-700">
        <div className="flex items-center mb-4">
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-full text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-slate-600 transition-colors duration-300"
          >
            <ArrowLeft style={{ width: '1.25em', height: '1.25em' }} />
          </button>
          <h3 className="text-sm font-bold text-gray-800 dark:text-white transition-colors duration-300">
            {renderTitle()}
          </h3>
        </div>
        <div className="space-y-1 max-h-80 overflow-y-auto p-1 rounded-lg bg-gray-50 dark:bg-slate-800 transition-colors duration-300">
          {detailedData.map((item) => {
            const isShelf = item.name.includes('. Raf');
            const itemKey = `${view.type}-${view.id}-${item.name}`;
            const isExpanded = expandedShelfKey === itemKey;
            
            let location: Location | null = null;
            if (isShelf) {
                const shelfNum = parseInt(item.name.split('.')[0]);
                if (view.level === 'section') {
                    location = { storageType: StorageType.Kompakt, unit: view.parent!.unitId, face: view.parent!.faceName, section: view.id!, shelf: shelfNum };
                } else {
                    location = { storageType: StorageType.Stand, stand: view.id!, shelf: shelfNum };
                }
            }

            return (
              <div key={itemKey}>
                  <button
                    onClick={() => {
                        if (isShelf) handleShelfClick(itemKey);
                        else if (view.level === 'unit') handleUnitDetailClick(item);
                    }}
                    className="w-full text-left p-3 rounded-lg bg-white dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-300"
                  >
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="font-medium text-gray-800 dark:text-gray-200 transition-colors duration-300">
                        {item.name}
                      </span>
                      <span className="font-bold text-gray-600 dark:text-gray-300 transition-colors duration-300">
                        {formatNumber(((item.occupancy as number) || 0), 0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-400 dark:bg-slate-600 rounded-full h-3 shadow-inner transition-colors duration-300">
                      <div className={`${getOccupancyColor(item.occupancy as number, theme === 'dark')} h-3 rounded-full shadow-sm transition-all duration-300`} style={{ width: `${Math.min(Number(item.occupancy) || 0, 100)}%` }} />
                    </div>
                  </button>
                  {isExpanded && location && (
                    <ExpandedShelfView 
                      location={location}
                      settings={settings}
                      getDepartmentName={getDepartmentName}
                    />
                  )}
              </div>
          )})}
        </div>
      </div>
    );
  }

  return (
    <div className="card-chart bg-white dark:bg-slate-800 shadow-lg transition-colors duration-300 border border-gray-200 dark:border-slate-700">
      <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 transition-colors duration-300">
        {renderTitle()}
      </h3>
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300 transition-colors duration-300">Kompakt Dolaplar</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(summary.kompakt).map(([name, percentage]) => (
              <button
                key={name}
                onClick={() => handleSummaryClick(StorageType.Kompakt, name)}
                className="text-left p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 transition-all hover:shadow-md hover:scale-105 duration-300"
                style={{ cursor: 'pointer' }}
              >
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="font-medium text-gray-800 dark:text-gray-200 transition-colors duration-300">{name}</span>
                  <span className="font-bold text-gray-600 dark:text-gray-300 transition-colors duration-300">
                    {formatNumber((Number(percentage) || 0), 0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-400 dark:bg-slate-600 rounded-full h-3 shadow-inner transition-colors duration-300">
                  <div className={`${getOccupancyColor(percentage as number, theme === 'dark')} h-3 rounded-full shadow-sm transition-all duration-300`} style={{ width: `${Math.min(Number(percentage) || 0, 100)}%` }} />
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300 transition-colors duration-300">Standlar</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(summary.stand).map(([name, percentage]) => (
              <button
                key={name}
                onClick={() => handleSummaryClick(StorageType.Stand, name)}
                className="text-left p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 transition-all hover:shadow-md hover:scale-105 duration-300"
                style={{ cursor: 'pointer' }}
              >
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="font-medium text-gray-800 dark:text-gray-200 transition-colors duration-300">{name}</span>
                  <span className="font-bold text-gray-600 dark:text-gray-300 transition-colors duration-300">
                    {formatNumber((Number(percentage) || 0), 0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-400 dark:bg-slate-600 rounded-full h-3 shadow-inner transition-colors duration-300">
                  <div className={`${getOccupancyColor(percentage as number, theme === 'dark')} h-3 rounded-full shadow-sm transition-all duration-300`} style={{ width: `${Math.min(Number(percentage) || 0, 100)}%` }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const LocationAnalysis = React.memo(LocationAnalysisInternal);
