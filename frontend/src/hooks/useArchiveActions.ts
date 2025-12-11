import { useCallback, Dispatch } from 'react';
import {
  ArchiveAction,
  ArchiveState,
  BackupPayload,
  Checkout,
  CheckoutStatus,
  Department,
  DetailedOccupancyItem,
  Folder,
  FolderStatus,
  FolderType,
  KompaktFace,
  KompaktUnitConfig,
  Location,
  Log,
  OccupancyInfo,
  Settings,
  StorageType,
} from '@/types';
import { toast } from '@/lib/toast';
import { DEFAULT_SETTINGS, INITIAL_STORAGE_STRUCTURE } from '@/constants';
import * as api from '@/api';

// Helper to format location for logs
const formatLocation = (location: Location) => {
  if (!location || !location.storageType) return 'Konumsuz';
  if (location.storageType === StorageType.Kompakt) {
    return `Ünite ${location.unit} - ${location.face} - ${location.section}.Bölüm - ${location.shelf}.Raf`;
  }
  if (location.storageType === StorageType.Stand) {
    return `Stand ${location.stand} - ${location.shelf}.Raf`;
  }
  return 'Bilinmeyen Lokasyon';
};

export const useArchiveActions = (
  state: ArchiveState,
  dispatch: Dispatch<ArchiveAction>
) => {
  const getDepartmentName = useCallback(
    (id: number) =>
      state.departments.find((d) => d.id === id)?.name || 'Bilinmeyen Birim',
    [state.departments]
  );
  
  const getFolderLogDetails = useCallback((folder: Folder) => {
    const parts = [
      `[${getDepartmentName(folder.departmentId)}]`,
      `"${folder.subject}"`,
      `(Kod: ${folder.fileCode},`,
      `Yıl: ${folder.fileYear},`,
      `Sayı: ${folder.fileCount},`,
    ];
    if (folder.clinic) {
      parts.push(`Klinik: ${folder.clinic},`);
    }
    parts.push(`Lokasyon: ${formatLocation(folder.location)})`);
    return parts.join(' ');
  }, [getDepartmentName]);


  const getFolderById = useCallback(
    (id: number) => (state.folders || []).find((f) => f.id === id),
    [state.folders]
  );

  const getCheckoutsForFolder = useCallback(
    (folderId: number) =>
      state.checkouts.filter((c) => c.folderId === folderId),
    [state.checkouts]
  );

  const setFolders = useCallback((folders: Folder[]) => {
    dispatch({ type: 'SET_FOLDERS', payload: folders });
  }, [dispatch]);

  const addLog = useCallback(
    (log: Omit<Log, 'id' | 'timestamp'>) => {
      // Loglama kritik olduğu için revert yapmıyoruz, sadece state'i güncelliyoruz ve kaydetmeyi deniyoruz.
      const newLog: Log = { ...log, id: Date.now(), timestamp: new Date() };
      dispatch({ type: 'SET_LOGS', payload: [newLog, ...state.logs] });
      api.addLogEntry(log).catch(e => {
        console.error("Log save failed:", e.message);
        toast.error(`Log kaydedilemedi: ${e.message}`);
      });
    },
    [state.logs, dispatch]
  );

  const addFolder = useCallback(
    async (folderData: Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
      const newFolder: Folder = {
        ...folderData,
        id: Date.now(),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: FolderStatus.Arsivde,
      };
      
      const previousFolders = state.folders || [];
      dispatch({ type: 'SET_FOLDERS', payload: [newFolder, ...previousFolders] });
      
      try {
        await api.createFolder(newFolder);
        toast.success('Klasör başarıyla kaydedildi!');
        addLog({ type: 'create', folderId: newFolder.id, details: `Yeni klasör eklendi: ${getFolderLogDetails(newFolder)}` });
      } catch (e: any) {
        toast.error(`Klasör kaydedilemedi: ${e.message}`);
        dispatch({ type: 'SET_FOLDERS', payload: previousFolders });
      }
    },
    [state.folders, addLog, dispatch, getFolderLogDetails]
  );

  const updateFolder = useCallback(
    async (updatedFolder: Folder) => {
      const folderWithTimestamp = { ...updatedFolder, updatedAt: new Date() };
      const previousFolders = state.folders || [];
      const nextFolders = previousFolders.map((f) => f.id === folderWithTimestamp.id ? folderWithTimestamp : f);
      dispatch({ type: 'SET_FOLDERS', payload: nextFolders });

      try {
        await api.updateFolder(folderWithTimestamp);
        toast.success('Klasör başarıyla güncellendi!');
        addLog({ type: 'update', folderId: updatedFolder.id, details: `Klasör güncellendi: ${getFolderLogDetails(updatedFolder)}` });
      } catch (e: any) {
        toast.error(`Klasör güncellenemedi: ${e.message}`);
        dispatch({ type: 'SET_FOLDERS', payload: previousFolders });
      }
    },
    [state.folders, addLog, dispatch, getFolderLogDetails]
  );

  const deleteFolder = useCallback(
    async (folderId: number) => {
      const folder = getFolderById(folderId) ?? (state.folders || []).find(f => f.id === folderId);
      if (!folder) return;
      if (folder.status === FolderStatus.Cikista) {
        toast.error('Bu klasör şu anda kullanıcıda olduğu için silinemez. Önce iade edilmesi gerekiyor.');
        return;
      }
      
      const previousState = { folders: state.folders, checkouts: state.checkouts, disposals: state.disposals };
      dispatch({ type: 'SET_FOLDERS', payload: (state.folders || []).filter((f) => f.id !== folderId) });
      dispatch({ type: 'SET_CHECKOUTS', payload: (state.checkouts || []).filter((c) => c.folderId !== folderId) });
      dispatch({ type: 'SET_DISPOSALS', payload: (state.disposals || []).filter((d) => d.folderId !== folderId) });

      try {
        await api.removeFolder(folderId);
        toast.success('Klasör ve ilişkili kayıtlar silindi.');
        addLog({ type: 'delete', folderId, details: `Klasör kalıcı olarak silindi: ${getFolderLogDetails(folder)}` });
      } catch (e: any) {
        // Extract clean error message from API response
        let errorMessage = 'Klasör silinemedi';
        if (e.response?.data?.error) {
          errorMessage = e.response.data.error;
        } else if (e.message && !e.message.includes('{')) {
          errorMessage = e.message;
        }
        toast.error(errorMessage);
        dispatch({ type: 'SET_FOLDERS', payload: previousState.folders });
        dispatch({ type: 'SET_CHECKOUTS', payload: previousState.checkouts });
        dispatch({ type: 'SET_DISPOSALS', payload: previousState.disposals });
      }
    },
    [getFolderById, state.folders, state.checkouts, state.disposals, addLog, dispatch, getFolderLogDetails]
  );

  const addCheckout = useCallback(
    async (checkoutData: Omit<Checkout, 'id' | 'status' | 'checkoutDate'>) => {
      const newCheckout: Checkout = { ...checkoutData, id: Date.now(), checkoutDate: new Date(), status: CheckoutStatus.Cikista };
      const previousState = { folders: state.folders || [], checkouts: state.checkouts || [] };
      
      const folderToUpdate = (state.folders || []).find(f => f.id === checkoutData.folderId);
      if (!folderToUpdate) {
        toast.error('Çıkış yapılacak klasör bulunamadı.');
        return;
      }
      const updatedFolder = { ...folderToUpdate, status: FolderStatus.Cikista };

      dispatch({ type: 'SET_CHECKOUTS', payload: [newCheckout, ...(state.checkouts || [])] });
      dispatch({ type: 'SET_FOLDERS', payload: (state.folders || []).map(f => f.id === checkoutData.folderId ? updatedFolder : f) });
      
      try {
        await api.createCheckout(newCheckout);
        await api.updateFolder(updatedFolder);
        toast.success('Çıkış verildi.');
        addLog({ type: 'checkout', folderId: checkoutData.folderId, details: `Klasör çıkışı yapıldı: ${getFolderLogDetails(folderToUpdate)}. Alan: ${checkoutData.personName} ${checkoutData.personSurname}` });
      } catch(e: any) {
        toast.error(`Çıkış işlemi kaydedilemedi: ${e.message}`);
        dispatch({ type: 'SET_CHECKOUTS', payload: previousState.checkouts });
        dispatch({ type: 'SET_FOLDERS', payload: previousState.folders });
      }
    },
    [state.checkouts, state.folders, addLog, dispatch, getFolderLogDetails]
  );
  
  const updateCheckout = useCallback(
    async (updatedCheckout: Checkout) => {
      const previousCheckouts = state.checkouts;
      const nextCheckouts = previousCheckouts.map((c) => c.id === updatedCheckout.id ? updatedCheckout : c);
      dispatch({ type: 'SET_CHECKOUTS', payload: nextCheckouts });

      try {
        await api.updateCheckout(updatedCheckout);
        toast.success('Çıkış bilgileri güncellendi.');
        // Log için klasör bilgilerini API'den alıyoruz çünkü context'teki folder listesi güncel olmayabilir.
        const folder = await api.getFolder(updatedCheckout.folderId);
        if (folder) {
          addLog({ type: 'checkout_update', folderId: folder.id, details: `Çıkış bilgileri güncellendi: ${getFolderLogDetails(folder)}` });
        } else {
           addLog({ type: 'checkout_update', folderId: updatedCheckout.folderId, details: `ID'si ${updatedCheckout.folderId} olan klasörün çıkış bilgileri güncellendi.` });
        }
      } catch (e: any) {
        toast.error(`Çıkış güncellenemedi: ${e.message}`);
        dispatch({ type: 'SET_CHECKOUTS', payload: previousCheckouts });
      }
    },
    [state.checkouts, dispatch, addLog, getFolderLogDetails]
  );

  const returnCheckout = useCallback(
    async (checkoutId: number) => {
      const checkout = state.checkouts.find((c) => c.id === checkoutId);
      if (!checkout) return;
      
      const updatedCheckout = { ...checkout, status: CheckoutStatus.IadeEdildi, actualReturnDate: new Date() };
      const previousState = { folders: state.folders || [], checkouts: state.checkouts || [] };

      const folderToUpdate = (state.folders || []).find(f => f.id === checkout.folderId);
      if (!folderToUpdate) {
        toast.error('İade edilecek klasör bulunamadı.');
        dispatch({ type: 'SET_CHECKOUTS', payload: previousState.checkouts });
        return;
      }
      const updatedFolder = { ...folderToUpdate, status: FolderStatus.Arsivde };

      dispatch({ type: 'SET_CHECKOUTS', payload: (state.checkouts || []).map(c => c.id === checkoutId ? updatedCheckout : c) });
      dispatch({ type: 'SET_FOLDERS', payload: (state.folders || []).map(f => f.id === checkout.folderId ? updatedFolder : f) });
      
      try {
        await api.updateCheckout(updatedCheckout);
        await api.updateFolder(updatedFolder);
        toast.success('Klasör iade alındı.');
        addLog({ type: 'return', folderId: checkout.folderId, details: `Klasör iade alındı: ${getFolderLogDetails(folderToUpdate)}` });
      } catch(e: any) {
        toast.error(`İade işlemi kaydedilemedi: ${e.message}`);
        dispatch({ type: 'SET_CHECKOUTS', payload: previousState.checkouts });
        dispatch({ type: 'SET_FOLDERS', payload: previousState.folders });
      }
    },
    [state.checkouts, state.folders, addLog, dispatch, getFolderLogDetails]
  );
  
  const disposeFolders = useCallback(
    async (folderIds: number[]) => {
      const foldersToDispose = (state.folders || []).filter((f) => 
        folderIds.some(id => String(f.id) === String(id) || f.id === id || Number(f.id) === Number(id))
      );
      
      if (foldersToDispose.some((f) => f.status === FolderStatus.Cikista)) {
        toast.error('Çıkışta olan klasörler imha edilemez.');
        return;
      }
      
      const previousState = { folders: state.folders, disposals: state.disposals };
      
      const now = new Date();
      const newDisposals = foldersToDispose.map((f, i) => ({ 
        id: `disposal_${Date.now()}_${i}`, // TEXT olarak ID oluştur
        folderId: f.id, 
        disposalDate: now.toISOString(), // ISO string olarak tarih
        originalFolderData: f 
      }));
      
      if (process.env.NODE_ENV === 'development') {
        if (import.meta.env.DEV) console.log('[DISPOSE DEBUG] New disposals to create:', JSON.stringify(newDisposals, null, 2));
      }
      
      // Klasörleri state'den SİL (sadece status güncelleme değil)
      const remainingFolders = state.folders.filter(f => 
        !folderIds.some(id => String(f.id) === String(id) || f.id === id || Number(f.id) === Number(id))
      );
      dispatch({ type: 'SET_FOLDERS', payload: remainingFolders });
      dispatch({ type: 'SET_DISPOSALS', payload: [...newDisposals, ...state.disposals] });
      
      try {
        if (process.env.NODE_ENV === 'development') {
          if (import.meta.env.DEV) console.log('[DISPOSE DEBUG] Creating disposals (folder will be deleted on backend)...');
        }
        // Backend'de disposal oluşturulurken klasör otomatik silinecek
        await Promise.all(newDisposals.map(api.createDisposal));
        if (process.env.NODE_ENV === 'development') {
          if (import.meta.env.DEV) console.log('[DISPOSE DEBUG] All API calls successful!');
        }
        toast.success(`${folderIds.length} klasör imha edildi.`);
        
        const details = `${folderIds.length} klasör imha edildi. Detaylar: ${foldersToDispose.map(f => getFolderLogDetails(f)).join(' | ')}`;
        addLog({ type: 'dispose', details });
      } catch (e: any) {
        if (process.env.NODE_ENV === 'development') {
          if (import.meta.env.DEV) console.log('[DISPOSE ERROR] Error during disposal:', e);
        }
        toast.error(`İmha işlemi kaydedilemedi: ${e.message}`);
        dispatch({ type: 'SET_FOLDERS', payload: previousState.folders });
        dispatch({ type: 'SET_DISPOSALS', payload: previousState.disposals });
      }
    },
    [state.folders, state.disposals, addLog, dispatch, getFolderLogDetails]
  );

  const updateSettings = useCallback(
    async (newSettings: Settings) => {
      const previousSettings = state.settings;
      dispatch({ type: 'SET_SETTINGS', payload: newSettings });
      try {
        await api.saveConfigs({ settings: newSettings });
        toast.success('Ayarlar kaydedildi!');

        const changes: string[] = [];
        const keyLabels: Record<keyof Settings, string> = {
          kompaktRafGenisligi: 'Kompakt Raf Genişliği',
          standRafGenisligi: 'Stand Raf Genişliği',
          darKlasorGenisligi: 'Dar Klasör Genişliği',
          genisKlasorGenisligi: 'Geniş Klasör Genişliği',
          pdfBoyutLimiti: 'PDF Boyut Limiti',
          logSaklamaSuresi: 'Log Saklama Süresi',
          yedeklemeKlasoru: 'Yedekleme Klasörü',
          pdfKayitKlasoru: 'PDF Kayıt Klasörü',
          excelKayitKlasoru: 'Excel Kayıt Klasörü',
          iadeUyarisiGun: 'İade Uyarısı',
          backupFrequency: 'Oto. Yedekleme Sıklığı',
          backupTime: 'Oto. Yedekleme Saati',
          backupRetention: 'Oto. Yedekleme Sayısı'
        };

        (Object.keys(keyLabels) as Array<keyof Settings>).forEach(key => {
          if (newSettings[key] !== previousSettings[key]) {
             if (key === 'yedeklemeKlasoru' || key === 'pdfKayitKlasoru' || key === 'excelKayitKlasoru') {
                changes.push(`${keyLabels[key]}: "${newSettings[key] || 'Varsayılan'}"`);
             } else {
                changes.push(`${keyLabels[key]}: ${newSettings[key]}`);
             }
          }
        });
        
        if (changes.length > 0) {
          addLog({ type: 'settings_update', details: `Sistem ayarları güncellendi: ${changes.join('; ')}` });
        }

      } catch (e: any) {
        toast.error(`Ayarlar kaydedilemedi: ${e.message}`);
        dispatch({ type: 'SET_SETTINGS', payload: previousSettings });
      }
    },
    [state.settings, dispatch, addLog]
  );

  const addDepartment = useCallback(
    async (dept: Omit<Department, 'id'>) => {
      const newDept = { ...dept, id: Date.now() };
      const previousDepts = state.departments;
      const nextDepts = [...previousDepts, newDept];
      dispatch({ type: 'SET_DEPARTMENTS', payload: nextDepts });

      try {
        await api.saveConfigs({ departments: nextDepts });
        toast.success('Birim eklendi.');
        addLog({ type: 'department_add', details: `Yeni birim eklendi: "${newDept.name}" (${newDept.category})` });
      } catch (e: any) {
        toast.error(`Birim eklenemedi: ${e.message}`);
        dispatch({ type: 'SET_DEPARTMENTS', payload: previousDepts });
      }
    },
    [state.departments, dispatch, addLog]
  );

  const updateDepartment = useCallback(
    async (dept: Department) => {
      const previousDepts = state.departments;
      const originalDept = previousDepts.find((d) => d.id === dept.id);

      if (!originalDept) {
        toast.error(`Güncellenecek birim bulunamadı: ID ${dept.id}`);
        return;
      }
      
      const updatedDept: Department = { ...originalDept, ...dept };
      const nextDepts = previousDepts.map((d) => (d.id === dept.id ? updatedDept : d));
      dispatch({ type: 'SET_DEPARTMENTS', payload: nextDepts });

      try {
        await api.saveConfigs({ departments: nextDepts });
        toast.success('Birim güncellendi.');
        // FIX: The incoming `dept` object might be partial. Use `updatedDept` which is the
        // result of merging the original department with the update data, ensuring all
        // properties are available for the log message.
        addLog({ type: 'department_update', details: `Birim güncellendi: "${updatedDept.name}" (${updatedDept.category})` });
      } catch (e: any) {
        toast.error(`Birim güncellenemedi: ${e.message}`);
        dispatch({ type: 'SET_DEPARTMENTS', payload: previousDepts });
      }
    },
    [state.departments, dispatch, addLog]
  );

  const deleteDepartment = useCallback(
    async (departmentId: number) => {
      if ((state.folders || []).some((f) => f.departmentId === departmentId)) {
        toast.error('Bu birime ait klasörler varken birim silinemez.');
        return;
      }
      const previousDepts = state.departments;
      const deptToDelete = previousDepts.find(d => d.id === departmentId);
      if (!deptToDelete) return;

      const nextDepts = previousDepts.filter((d) => d.id !== departmentId);
      dispatch({ type: 'SET_DEPARTMENTS', payload: nextDepts });

      try {
        await api.saveConfigs({ departments: nextDepts });
        toast.success('Birim silindi.');
        addLog({ type: 'department_delete', details: `Birim silindi: "${deptToDelete.name}"` });
      } catch (e: any) {
        toast.error(`Birim silinemedi: ${e.message}`);
        dispatch({ type: 'SET_DEPARTMENTS', payload: previousDepts });
      }
    },
    [state.folders, state.departments, dispatch, addLog]
  );
  
  const addStorageUnit = useCallback(
    async (type: StorageType, config?: KompaktUnitConfig) => {
      const previousStructure = state.storageStructure;
      // Defensive: storageStructure null/undefined kontrolü
      const safeStructure = {
        kompakt: previousStructure?.kompakt || [],
        stand: previousStructure?.stand || [],
      };
      const newStructure = JSON.parse(JSON.stringify(safeStructure));
      let unitName = '';

      if (type === StorageType.Kompakt && config) {
        const lastKompakt = newStructure.kompakt.length > 0 ? newStructure.kompakt[newStructure.kompakt.length - 1] : null;
        const newUnitId = (lastKompakt?.unit || 0) + 1;
        unitName = `Kompakt Ünite ${newUnitId}`;
        const faces: KompaktFace[] = [];
        if (config.hasFaceA) faces.push({ name: 'A Yüzü', sections: [] });
        if (config.hasFaceB) faces.push({ name: 'B Yüzü', sections: [] });
        if (config.hasFaceGizli) faces.push({ name: 'Gizli Yüzü', sections: [] });
        
        faces.forEach((face) => {
          face.sections = Array.from({ length: config.sectionsPerFace }, (_, j) => ({
              section: j + 1,
              shelves: Array.from({ length: config.shelvesPerSection }, (_, k) => k + 1),
          }));
        });
        newStructure.kompakt.push({ unit: newUnitId, faces });
      } else if (type === StorageType.Stand) {
        const lastStand = newStructure.stand.length > 0 ? newStructure.stand[newStructure.stand.length - 1] : null;
        const newStandId = (lastStand?.stand || 0) + 1;
        unitName = `Stand ${newStandId}`;
        newStructure.stand.push({ stand: newStandId, shelves: [1, 2, 3, 4, 5] });
      }

      dispatch({ type: 'SET_STORAGE_STRUCTURE', payload: newStructure });
      try {
        await api.saveConfigs({ storageStructure: newStructure });
        toast.success('Lokasyon eklendi.');
        addLog({ type: 'location_add', details: `Yeni lokasyon eklendi: "${unitName}"` });
      } catch (e: any) {
        toast.error(`Lokasyon eklenemedi: ${e.message}`);
        dispatch({ type: 'SET_STORAGE_STRUCTURE', payload: previousStructure });
      }
    },
    [state.storageStructure, dispatch, addLog]
  );

  const isUnitDeletable = useCallback(
    (type: StorageType, id: number): boolean =>
      !(state.folders || []).some((f) => f.location.storageType === type && (f.location.unit === id || f.location.stand === id)),
    [state.folders]
  );

  const deleteStorageUnit = useCallback(
    async (type: StorageType, id: number) => {
      if (!isUnitDeletable(type, id)) {
        toast.error('Bu lokasyonda klasörler bulunduğu için silinemez.');
        return;
      }
      const previousStructure = state.storageStructure;
      const newStructure = JSON.parse(JSON.stringify(previousStructure));
      const unitName = type === StorageType.Kompakt ? `Kompakt Ünite ${id}` : `Stand ${id}`;
      if (type === StorageType.Kompakt) newStructure.kompakt = newStructure.kompakt.filter((u: any) => u.unit !== id);
      else if (type === StorageType.Stand) newStructure.stand = newStructure.stand.filter((s: any) => s.stand !== id);
      
      dispatch({ type: 'SET_STORAGE_STRUCTURE', payload: newStructure });
      try {
        await api.saveConfigs({ storageStructure: newStructure });
        toast.success('Lokasyon silindi.');
        addLog({ type: 'location_delete', details: `Lokasyon silindi: "${unitName}"` });
      } catch (e: any) {
        toast.error(`Lokasyon silinemedi: ${e.message}`);
        dispatch({ type: 'SET_STORAGE_STRUCTURE', payload: previousStructure });
      }
    },
    [isUnitDeletable, state.storageStructure, dispatch, addLog]
  );

  const updateStorageUnitShelves = useCallback(
    async (type: StorageType, id: number, newShelfCount: number): Promise<boolean> => {
      if (newShelfCount < 1 || newShelfCount > 10) {
        toast.error('Raf sayısı 1-10 arasında olmalıdır.');
        return false;
      }
      if (!isUnitDeletable(type, id)) {
        toast.error('İçinde klasör bulunan bir lokasyonun raf yapısı değiştirilemez.');
        return false;
      }

      const previousStructure = state.storageStructure;
      const newStructure = JSON.parse(JSON.stringify(previousStructure));
      const newShelves = Array.from({ length: newShelfCount }, (_, i) => i + 1);
      const unitName = type === StorageType.Kompakt ? `Kompakt Ünite ${id}` : `Stand ${id}`;
      
      if (type === StorageType.Kompakt) {
        const unit = newStructure.kompakt.find((u: any) => u.unit === id);
        if (unit) unit.faces.forEach((f: any) => f.sections.forEach((s: any) => (s.shelves = newShelves)));
      } else if (type === StorageType.Stand) {
        const stand = newStructure.stand.find((s: any) => s.stand === id);
        if (stand) stand.shelves = newShelves;
      }
      
      dispatch({ type: 'SET_STORAGE_STRUCTURE', payload: newStructure });
      try {
        await api.saveConfigs({ storageStructure: newStructure });
        toast.success('Raf yapısı güncellendi.');
        addLog({ type: 'location_update', details: `"${unitName}" lokasyonunun raf yapısı güncellendi. Yeni raf sayısı: ${newShelfCount}` });
        return true;
      } catch (e: any) {
        toast.error(`Raf yapısı güncellenemedi: ${e.message}`);
        dispatch({ type: 'SET_STORAGE_STRUCTURE', payload: previousStructure });
        return false;
      }
    },
    [isUnitDeletable, state.storageStructure, dispatch, addLog]
  );
  
  const getOccupancy = useCallback(
    (location: Location): OccupancyInfo => {
      const foldersInLocation = (state.folders || []).filter(f => {
        if (f.status === FolderStatus.Imha) return false;
        if (f.location.storageType !== location.storageType) return false;
        
        if (location.storageType === StorageType.Kompakt) {
          return f.location.unit === location.unit && 
                 f.location.face === location.face && 
                 f.location.section === location.section && 
                 f.location.shelf === location.shelf;
        } else {
          return f.location.stand === location.stand && 
                 f.location.shelf === location.shelf;
        }
      });
      const total = location.storageType === StorageType.Kompakt ? state.settings.kompaktRafGenisligi : state.settings.standRafGenisligi;
      const used = foldersInLocation.reduce((acc, f) => acc + (f.folderType === FolderType.Dar ? state.settings.darKlasorGenisligi : state.settings.genisKlasorGenisligi), 0);
      return { total, used, percentage: total > 0 ? (used / total) * 100 : 0, folders: foldersInLocation };
    },
    [state.folders, state.settings]
  );

  const getLocationOccupancySummary = useCallback(() => {
    const kompakt: Record<string, number> = {};
    const stand: Record<string, number> = {};
    state.storageStructure.kompakt.forEach(u => {
      const foldersInUnit = (state.folders || []).filter(f => f.location.unit === u.unit && f.status !== FolderStatus.Imha);
      const totalSpace = u.faces.reduce((sum, face) => sum + face.sections.length * face.sections[0].shelves.length * state.settings.kompaktRafGenisligi, 0);
      const usedSpace = foldersInUnit.reduce((sum, f) => sum + (f.folderType === FolderType.Dar ? state.settings.darKlasorGenisligi : state.settings.genisKlasorGenisligi), 0);
      kompakt[`Ünite ${u.unit}`] = totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0;
    });
    state.storageStructure.stand.forEach(s => {
      const foldersInStand = (state.folders || []).filter(f => f.location.stand === s.stand && f.status !== FolderStatus.Imha);
      const totalSpace = s.shelves.length * state.settings.standRafGenisligi;
      const usedSpace = foldersInStand.reduce((sum, f) => sum + (f.folderType === FolderType.Dar ? state.settings.darKlasorGenisligi : state.settings.genisKlasorGenisligi), 0);
      stand[`Stand ${s.stand}`] = totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0;
    });
    return { kompakt, stand };
  }, [state.folders, state.storageStructure, state.settings]);

  const getDetailedOccupancy = useCallback(
    (type: StorageType, id: number): DetailedOccupancyItem[] => {
      if (type === StorageType.Kompakt) {
        const unit = state.storageStructure.kompakt.find(u => u.unit === id);
        if (!unit) return [];
        return unit.faces.flatMap(face => face.sections.map(section => {
          const totalSpace = section.shelves.length * state.settings.kompaktRafGenisligi;
          const usedSpace = (state.folders || []).filter(f => f.status !== FolderStatus.Imha && f.location.unit === id && f.location.face === face.name && f.location.section === section.section)
            .reduce((sum, f) => sum + (f.folderType === FolderType.Dar ? state.settings.darKlasorGenisligi : state.settings.genisKlasorGenisligi), 0);
          return { name: `${face.name} - ${section.section}. Bölüm`, occupancy: totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0, faceName: face.name, sectionId: section.section };
        }));
      } else {
        const stand = state.storageStructure.stand.find(s => s.stand === id);
        if (!stand) return [];
        return stand.shelves.map(shelf => ({ name: `${shelf}. Raf`, occupancy: getOccupancy({ storageType: StorageType.Stand, stand: id, shelf }).percentage }));
      }
    },
    [state.storageStructure, state.folders, state.settings, getOccupancy]
  );

  const getShelfDetailsForSection = useCallback(
    (unitId: number, faceName: string, sectionId: number): DetailedOccupancyItem[] => {
      const section = state.storageStructure.kompakt.find(u => u.unit === unitId)?.faces.find(f => f.name === faceName)?.sections.find(s => s.section === sectionId);
      if (!section) return [];
      return section.shelves.map(shelf => ({ name: `${shelf}. Raf`, occupancy: getOccupancy({ storageType: StorageType.Kompakt, unit: unitId, face: faceName, section: sectionId, shelf }).percentage }));
    },
    [state.storageStructure, getOccupancy]
  );

  const restoreFromBackup = useCallback(
    (data: BackupPayload) => {
      dispatch({
        type: 'SET_ALL_DATA',
        payload: {
          folders: data.folders || [],
          departments: data.departments || [],
          checkouts: data.checkouts || [],
          disposals: data.disposals || [],
          logs: data.logs || [],
          settings: data.settings || DEFAULT_SETTINGS,
          storageStructure: data.storageStructure || INITIAL_STORAGE_STRUCTURE,
        },
      });
    },
    [dispatch]
  );

  return {
    getDepartmentName, getFolderById, getCheckoutsForFolder, addLog, addFolder, updateFolder, deleteFolder,
    addCheckout, updateCheckout, returnCheckout, disposeFolders, updateSettings, addDepartment, updateDepartment, deleteDepartment,
    isUnitDeletable, addStorageUnit, deleteStorageUnit, updateStorageUnitShelves, getOccupancy,
    getLocationOccupancySummary, getDetailedOccupancy, getShelfDetailsForSection, restoreFromBackup, setFolders
  };
};