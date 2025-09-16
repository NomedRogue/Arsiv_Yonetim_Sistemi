// frontend/src/pages/Settings.tsx
import { DEFAULT_SETTINGS } from '@/constants';
import React, { useEffect, useState } from 'react';
import { useArchive } from '@/context/ArchiveContext';
import {
  Settings as SettingsType,
  Department,
  Category,
  StorageType,
  KompaktUnitConfig,
} from '@/types';
import { Modal } from '@/components/Modal';
import { Edit, Trash2, HardDrive } from 'lucide-react';
import { toast } from '@/lib/toast';
import { deleteBackup } from '@/api';

declare global {
  interface Window {
    electronAPI: { openFolderDialog: () => Promise<string | null> };
  }
}

const SettingInput: React.FC<{
  label: string;
  id: keyof SettingsType | string;
  value: string | number;
  type?: string;
  unit?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}> = ({ label, id, value, type = 'number', unit, onChange, disabled = false }) => (
  <div>
    <label htmlFor={String(id)} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
    </label>
    <div className="mt-1 relative rounded-md shadow-sm">
      <input
        type={type}
        name={String(id)}
        id={String(id)}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="block w-full pr-12 p-2 sm:text-sm border-gray-300 rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-gray-200 disabled:opacity-50"
      />
      {unit && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-gray-500 sm:text-sm dark:text-gray-400">{unit}</span>
        </div>
      )}
    </div>
  </div>
);

const FilePathInput: React.FC<{
  label: string;
  id: keyof SettingsType;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBrowseClick: () => void;
}> = ({ label, id, value, onChange, onBrowseClick }) => (
  <div>
    <label htmlFor={String(id)} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
    </label>
    <div className="mt-1 flex rounded-md shadow-sm">
      <input
        type="text"
        name={String(id)}
        id={String(id)}
        value={value}
        onChange={onChange}
        className="block w-full p-2 sm:text-sm border-gray-300 rounded-l-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-gray-200"
      />
      <button
        type="button"
        onClick={onBrowseClick}
        className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-500 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600"
      >
        <span>Gözat...</span>
      </button>
    </div>
  </div>
);

type BackupRow = { filename: string; size: number; mtimeMs: number; iso: string };

export const Settings: React.FC = () => {
  const {
    settings,
    updateSettings,
    departments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    storageStructure,
    addStorageUnit,
    deleteStorageUnit,
    updateStorageUnitShelves,
    isUnitDeletable,
    refresh,
    lastBackupEvent,
    lastRestoreEvent,
    lastBackupCleanupEvent,
  } = useArchive();

  const [currentSettings, setCurrentSettings] = useState<SettingsType>(settings);

  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);

  const [isDepartmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [departmentModalMode, setDepartmentModalMode] = useState<'add' | 'edit'>('add');
  const [currentDepartment, setCurrentDepartment] = useState<Omit<Department, 'id'>>({
    name: '',
    category: Category.Idari,
  });
  const [editingDepartmentId, setEditingDepartmentId] = useState<number | null>(null);

  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'department' | 'location'; data: any } | null>(null);

  const [isLocationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<{ type: StorageType; id: number; shelfCount: number } | null>(null);
  const [newShelfCount, setNewShelfCount] = useState(5);

  const [isKompaktAddModalOpen, setKompaktAddModalOpen] = useState(false);
  const initialKompaktConfig: KompaktUnitConfig = {
    hasFaceA: true,
    hasFaceB: true,
    hasFaceGizli: false,
    sectionsPerFace: 3,
    shelvesPerSection: 5,
  };
  const [kompaktConfig, setKompaktConfig] = useState<KompaktUnitConfig>(initialKompaktConfig);

  const [isRestoreModalOpen, setRestoreModalOpen] = useState(false);
  const [pendingRestoreFilename, setPendingRestoreFilename] = useState<string>('');
  
  const [isBackupDeleteModalOpen, setBackupDeleteModalOpen] = useState(false);
  const [pendingDeleteFilename, setPendingDeleteFilename] = useState<string>('');

  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [backupFolder, setBackupFolder] = useState<string>('');
  
  const loadBackups = async () => {
    try {
      const res = await fetch('/api/list-backups');
      if (!res.ok) throw new Error();
      const { files, folder } = await res.json();
      setBackups(files || []);
      setBackupFolder(folder || '');
    } catch (e) {
      console.error('[Settings] Load backups error:', e);
      setBackups([]);
      setBackupFolder('');
    }
  };

  useEffect(() => {
    loadBackups();
  }, [currentSettings.yedeklemeKlasoru]);

  useEffect(() => {
    if (lastBackupEvent || lastRestoreEvent || lastBackupCleanupEvent) {
      setTimeout(() => loadBackups(), 500);
    }
  }, [lastBackupEvent, lastRestoreEvent, lastBackupCleanupEvent]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setCurrentSettings((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value,
    }));
  };

  const handleBrowseClick = async (id: keyof SettingsType) => {
    if (window.electronAPI) {
      const path = await window.electronAPI.openFolderDialog();
      if (path) setCurrentSettings((prev) => ({ ...prev, [id]: path }));
    } else {
      toast.info('Bu özellik sadece masaüstü uygulamasında mevcuttur.');
    }
  };

  const handleSave = async () => {
    const normalized: SettingsType = {
      ...DEFAULT_SETTINGS,
      ...currentSettings,
      backupFrequency: (currentSettings.backupFrequency || DEFAULT_SETTINGS.backupFrequency) as SettingsType['backupFrequency'],
      backupTime: currentSettings.backupTime || DEFAULT_SETTINGS.backupTime,
      backupRetention: Math.max(1, Number(currentSettings.backupRetention ?? DEFAULT_SETTINGS.backupRetention)),
    };
    updateSettings(normalized);
    setTimeout(() => loadBackups(), 1000);
  };

  const handleOpenAddModal = () => {
    setDepartmentModalMode('add');
    setCurrentDepartment({ name: '', category: Category.Idari });
    setEditingDepartmentId(null);
    setDepartmentModalOpen(true);
  };

  const handleOpenEditModal = (department: Department) => {
    setDepartmentModalMode('edit');
    setCurrentDepartment({ name: department.name, category: department.category });
    setEditingDepartmentId(department.id);
    setDepartmentModalOpen(true);
  };

  const handleCloseDepartmentModal = () => setDepartmentModalOpen(false);

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentDepartment((prev) => ({ ...prev, [name]: value }));
  };

  const handleDepartmentSubmit = () => {
    if (!currentDepartment.name.trim()) {
      toast.error('Birim adı boş olamaz.');
      return;
    }
    if (departmentModalMode === 'add') addDepartment(currentDepartment);
    else if (editingDepartmentId) updateDepartment({ id: editingDepartmentId, ...currentDepartment });
    handleCloseDepartmentModal();
  };

  const handleOpenLocationEditModal = (type: StorageType, id: number, currentShelves: number) => {
    setEditingLocation({ type, id, shelfCount: currentShelves });
    setNewShelfCount(currentShelves);
    setLocationModalOpen(true);
  };
  const handleCloseLocationModal = () => setLocationModalOpen(false);

  const handleLocationSubmit = async () => {
    if (editingLocation) {
      const ok = await updateStorageUnitShelves(editingLocation.type, editingLocation.id, newShelfCount);
      if (ok) handleCloseLocationModal();
    }
  };

  const handleOpenKompaktAddModal = () => {
    setKompaktConfig(initialKompaktConfig);
    setKompaktAddModalOpen(true);
  };
  
  function kompaktConfigChangeHandler(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setKompaktConfig((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : Number(value) }));
  }
  
  const handleAddKompaktUnit = () => {
    if (!kompaktConfig.hasFaceA && !kompaktConfig.hasFaceB && !kompaktConfig.hasFaceGizli) {
      toast.error('En az bir yüz seçmelisiniz.');
      return;
    }
    if (kompaktConfig.sectionsPerFace < 1 || kompaktConfig.shelvesPerSection < 1) {
      toast.error('Bölüm ve raf sayısı en az 1 olmalıdır.');
      return;
    }
    addStorageUnit(StorageType.Kompakt, kompaktConfig);
    setKompaktAddModalOpen(false);
  };

  const handleOpenDeleteModal = (type: 'department' | 'location', data: any) => {
    setItemToDelete({ type, data });
    setDeleteModalOpen(true);
  };
  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setItemToDelete(null);
  };
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'department') deleteDepartment(itemToDelete.data.id);
    else if (itemToDelete.type === 'location') deleteStorageUnit(itemToDelete.data.type, itemToDelete.data.id);
    handleCloseDeleteModal();
  };

  const handleServerSideBackup = async () => {
    try {
      const res = await fetch('/api/backup-db-to-folder', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Bilinmeyen bir yedekleme hatası.');
      }
      // SSE event'i toast gösterecek
    } catch (e: any) {
      toast.error(`Yedek oluşturulamadı: ${e.message}`);
    }
  };

  const handleOpenRestoreModal = (filename: string) => {
    setPendingRestoreFilename(filename);
    setRestoreModalOpen(true);
  };

  const handleCloseRestoreModal = () => {
    setRestoreModalOpen(false);
    setPendingRestoreFilename('');
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreFilename) return;
    try {
      await fetch('/api/restore-db-from-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: pendingRestoreFilename }),
      });
      handleCloseRestoreModal();
      // SSE event'i sayfayı yenileyecek
    } catch (e: any) {
      console.error('[Settings] Restore error:', e);
      toast.error(`Geri yükleme başarısız: ${e.message}`);
    }
  };

  const openBackupDeleteModal = (filename: string) => {
    setPendingDeleteFilename(filename);
    setBackupDeleteModalOpen(true);
  };

  const closeBackupDeleteModal = () => {
    setPendingDeleteFilename('');
    setBackupDeleteModalOpen(false);
  };

  const handleConfirmBackupDelete = async () => {
    if (!pendingDeleteFilename) return;
    try {
      await deleteBackup(pendingDeleteFilename);
      toast.success(`'${pendingDeleteFilename}' silindi.`);
      await loadBackups();
    } catch (error: any) {
      toast.error(`Yedek silinemedi: ${error.message}`);
    }
    closeBackupDeleteModal();
  };

  const backupFrequency = (currentSettings.backupFrequency ?? DEFAULT_SETTINGS.backupFrequency) as SettingsType['backupFrequency'];
  const backupTime = currentSettings.backupTime ?? DEFAULT_SETTINGS.backupTime;
  const backupRetention = Number(currentSettings.backupRetention ?? DEFAULT_SETTINGS.backupRetention);

  return (
    <div className="p-6">
      <Modal isOpen={isDepartmentModalOpen} onClose={handleCloseDepartmentModal} title={departmentModalMode === 'add' ? 'Yeni Birim Ekle' : 'Birimi Düzenle'} onConfirm={handleDepartmentSubmit} confirmText="Kaydet" confirmColor="bg-status-blue">
        <div className="space-y-4">
          <div>
            <label htmlFor="department-name-input" className="block text-sm font-medium text-gray-800 dark:text-gray-200">Birim Adı</label>
            <input id="department-name-input" type="text" name="name" value={currentDepartment.name} onChange={handleDepartmentChange} className="mt-1 block w-full p-2 border rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Kategori</label>
            <div className="flex space-x-4 mt-2 p-2 rounded-md bg-gray-100 dark:bg-slate-700">
              <label className="flex items-center">
                <input type="radio" name="category" value={Category.Idari} checked={currentDepartment.category === Category.Idari} onChange={handleDepartmentChange} className="w-4 h-4"/>
                <span className="ml-2">İdari</span>
              </label>
              <label className="flex items-center">
                <input type="radio" name="category" value={Category.Tibbi} checked={currentDepartment.category === Category.Tibbi} onChange={handleDepartmentChange} className="w-4 h-4"/>
                <span className="ml-2">Tıbbi</span>
              </label>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isLocationModalOpen} onClose={handleCloseLocationModal} title="Raf Sayısını Düzenle" onConfirm={handleLocationSubmit} confirmText="Güncelle" confirmColor="bg-status-blue">
        <div>
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Yeni Raf Sayısı</label>
          <input type="number" min={1} max={10} value={newShelfCount} onChange={(e) => setNewShelfCount(Number(e.target.value))} className="mt-1 block w-full p-2 border rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500"/>
        </div>
      </Modal>

      <Modal isOpen={isKompaktAddModalOpen} onClose={() => setKompaktAddModalOpen(false)} title="Yeni Kompakt Dolap Ekle" onConfirm={handleAddKompaktUnit} confirmText="Ekle" confirmColor="bg-status-blue">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Dolap Yüzleri</label>
            <div className="mt-2 space-y-2 p-3 bg-gray-50 dark:bg-slate-700 rounded-md">
              <label className="flex items-center"><input type="checkbox" name="hasFaceA" checked={kompaktConfig.hasFaceA} onChange={kompaktConfigChangeHandler} className="w-4 h-4" /><span className="ml-2">A Yüzü</span></label>
              <label className="flex items-center"><input type="checkbox" name="hasFaceB" checked={kompaktConfig.hasFaceB} onChange={kompaktConfigChangeHandler} className="w-4 h-4" /><span className="ml-2">B Yüzü</span></label>
              <label className="flex items-center"><input type="checkbox" name="hasFaceGizli" checked={kompaktConfig.hasFaceGizli} onChange={kompaktConfigChangeHandler} className="w-4 h-4" /><span className="ml-2">Gizli Yüzü</span></label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Yüz Başına Bölüm Sayısı</label>
            <input type="number" name="sectionsPerFace" min={1} max={10} value={kompaktConfig.sectionsPerFace} onChange={kompaktConfigChangeHandler} className="mt-1 block w-full p-2 border rounded-md bg-white dark:bg-slate-600 dark:border-gray-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Bölüm Başına Raf Sayısı</label>
            <input type="number" name="shelvesPerSection" min={1} max={10} value={kompaktConfig.shelvesPerSection} onChange={kompaktConfigChangeHandler} className="mt-1 block w-full p-2 border rounded-md bg-white dark:bg-slate-600 dark:border-gray-500"/>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal} title={`${itemToDelete?.type === 'department' ? 'Birimi' : 'Lokasyonu'} Sil`} onConfirm={handleConfirmDelete} confirmText="Sil" type="danger" showIcon>
        <p><span className="font-bold">{itemToDelete?.data?.name || `${itemToDelete?.data?.type === StorageType.Kompakt ? 'Ünite' : 'Stand'} ${itemToDelete?.data?.id}`}</span>{' '}isimli öğeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
      </Modal>

      <Modal isOpen={isRestoreModalOpen} onClose={handleCloseRestoreModal} title="Geri Yükleme Onayı" onConfirm={handleConfirmRestore} confirmText="Geri Yükle" type="warning" showIcon>
        <div className="space-y-3">
          <p><span className="font-bold text-amber-600 dark:text-amber-400">"{pendingRestoreFilename}"</span> dosyasından geri yükleme yapılacak.</p>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md"><p className="text-sm text-amber-800 dark:text-amber-200"><strong>Uyarı:</strong> Mevcut tüm veriler kaybolacak ve yedeğin durumuna geri dönülecek. Bu işlem geri alınamaz.</p></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Devam etmek istediğinizden emin misiniz?</p>
        </div>
      </Modal>

      <Modal isOpen={isBackupDeleteModalOpen} onClose={closeBackupDeleteModal} title="Yedek Silme Onayı" onConfirm={handleConfirmBackupDelete} confirmText="Evet, Sil" type="danger" showIcon>
        <p>
          <span className="font-bold text-red-600 dark:text-red-400">"{pendingDeleteFilename}"</span> isimli yedek dosyasını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
        </p>
      </Modal>

      <div className="max-w-5xl mx-auto space-y-8">
        <div className="bg-white dark:bg-archive-dark-panel p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4">Ölçü Tanımları</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SettingInput label="Kompakt Dolap Raf Genişliği" id="kompaktRafGenisligi" value={currentSettings.kompaktRafGenisligi} unit="cm" onChange={handleChange} />
            <SettingInput label="Stand Raf Genişliği" id="standRafGenisligi" value={currentSettings.standRafGenisligi} unit="cm" onChange={handleChange} />
            <SettingInput label="Dar Klasör Genişliği" id="darKlasorGenisligi" value={currentSettings.darKlasorGenisligi} unit="cm" onChange={handleChange} />
            <SettingInput label="Geniş Klasör Genişliği" id="genisKlasorGenisligi" value={currentSettings.genisKlasorGenisligi} unit="cm" onChange={handleChange} />
          </div>
        </div>

        <div className="bg-white dark:bg-archive-dark-panel p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4">Sistem Ayarları</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SettingInput label="PDF Boyut Limiti" id="pdfBoyutLimiti" value={currentSettings.pdfBoyutLimiti} unit="MB" onChange={handleChange} />
            <SettingInput label="Log Saklama Süresi" id="logSaklamaSuresi" value={currentSettings.logSaklamaSuresi} unit="Yıl" onChange={handleChange} />
            <FilePathInput label="PDF Kayıt Klasörü" id="pdfKayitKlasoru" value={currentSettings.pdfKayitKlasoru} onChange={handleChange} onBrowseClick={() => handleBrowseClick('pdfKayitKlasoru')} />
            <FilePathInput label="Yedekleme Klasörü" id="yedeklemeKlasoru" value={currentSettings.yedeklemeKlasoru} onChange={handleChange} onBrowseClick={() => handleBrowseClick('yedeklemeKlasoru')} />
            <SettingInput label="İade Uyarısı" id="iadeUyarisiGun" value={currentSettings.iadeUyarisiGun} unit="Gün Önce" onChange={handleChange} />
          </div>

          <div className="mt-6 border-t pt-4 dark:border-gray-700">
            <h3 className="font-semibold mb-3">Otomatik Yedekleme</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="backupFrequency" className="block text-sm font-medium mb-1">Sıklık</label>
                <select id="backupFrequency" name="backupFrequency" value={backupFrequency} onChange={handleChange} className="w-full p-2 border rounded-md bg-white dark:bg-slate-600 dark:border-gray-500">
                  <option value="Kapalı">Kapalı</option>
                  <option value="Günlük">Günlük</option>
                  <option value="Haftalık">Haftalık</option>
                </select>
              </div>
              <SettingInput label="Saat" id="backupTime" value={backupTime} type="time" onChange={handleChange as any} />
              <SettingInput label="Tutulacak Yedek Sayısı" id="backupRetention" value={backupRetention} type="number" onChange={handleChange as any} />
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              <button onClick={handleServerSideBackup} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-800" title="Ayarlar > Yedekleme Klasörü'ne kopyalar">
                <HardDrive size={16} /> Sunucuda Yedekle
              </button>
            </div>

            <div className="mt-6">
              <h4 className="font-semibold mb-2">Yedek Geçmişi</h4>
              {backupFolder && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Yedekleme Konumu: <code className="bg-gray-100 dark:bg-slate-700 p-1 rounded">{backupFolder}</code></p>}
              {backups.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Kayıtlı yedek bulunamadı.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left border-b dark:border-slate-700">
                      <tr>
                        <th className="py-2 pr-4">Dosya</th>
                        <th className="py-2 pr-4">Tarih</th>
                        <th className="py-2 pr-4">Boyut</th>
                        <th className="py-2">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backups.map((b) => (
                        <tr key={b.filename} className="border-b last:border-0 dark:border-slate-700">
                          <td className="py-2 pr-4">{b.filename}</td>
                          <td className="py-2 pr-4">{new Date(b.iso).toLocaleString()}</td>
                          <td className="py-2 pr-4">{(b.size / (1024 * 1024)).toFixed(2)} MB</td>
                          <td className="py-2 flex gap-2">
                            <button onClick={() => handleOpenRestoreModal(b.filename)} className="px-3 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">Geri Yükle</button>
                            <button onClick={() => openBackupDeleteModal(b.filename)} className="px-3 py-1 rounded-md bg-rose-600 text-white hover:bg-rose-700">Sil</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                "Sunucuda Yedekle" ayarlarda seçili <b>Yedekleme Klasörü</b> içine <code>arsiv_YYYYMMDD_HHMMSS.db</code> oluşturur.
                Otomatik yedekleme etkinse, belirttiğiniz saat ve sıklıkta çalışır; yalnızca son <b>{backupRetention}</b> kopya tutulur.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-archive-dark-panel p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4">Birim Yönetimi</h2>
          <div className="max-h-60 overflow-y-auto border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-slate-800">
            <ul className="divide-y dark:divide-gray-600">
              {departments.map((dep) => (
                <li key={dep.id} className="p-3 flex justify-between items-center">
                  <div>
                    <span className="font-medium">{dep.name}</span>
                    <span className={`ml-3 text-xs font-semibold px-2 py-1 rounded-full ${dep.category === 'Tıbbi' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                      {dep.category}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => handleOpenEditModal(dep)} className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400" title="Düzenle"><Edit size={16} /></button>
                    <button onClick={() => handleOpenDeleteModal('department', dep)} className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400" title="Sil"><Trash2 size={16} /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <button onClick={handleOpenAddModal} className="mt-4 px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">Yeni Birim Ekle</button>
        </div>

        <div className="bg-white dark:bg-archive-dark-panel p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4">Lokasyon Yönetimi</h2>
          <div className="grid grid-cols-1 gap-8">
            <div>
              <h3 className="font-semibold mb-2">Kompakt Dolaplar</h3>
              <div className="max-h-48 overflow-y-auto border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-slate-800">
                <ul className="divide-y dark:divide-gray-600">
                  {storageStructure.kompakt.map((unit) => {
                    const deletable = isUnitDeletable(StorageType.Kompakt, unit.unit);
                    const shelfCount = unit.faces[0]?.sections[0]?.shelves.length || 0;
                    return (
                      <li key={unit.unit} className="p-3 flex justify-between items-center">
                        <span className="font-medium">Ünite {unit.unit} ({shelfCount} Raf)</span>
                        <div className="flex space-x-2">
                          <button onClick={() => handleOpenLocationEditModal(StorageType.Kompakt, unit.unit, shelfCount)} className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400" title="Düzenle"><Edit size={16} /></button>
                          <div className="relative group">
                            <button onClick={() => handleOpenDeleteModal('location', { type: StorageType.Kompakt, id: unit.unit })} disabled={!deletable} className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 disabled:opacity-50" title="Sil"><Trash2 size={16} /></button>
                            {!deletable && (<div className="absolute bottom-full mb-2 w-48 p-2 text-xs text-white bg-gray-900 rounded-md shadow-lg opacity-0 group-hover:opacity-100">Bu ünitede klasörler bulunduğu için silinemez.</div>)}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <button onClick={handleOpenKompaktAddModal} className="mt-4 px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">Yeni Kompakt Dolap Ekle</button>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Standlar</h3>
              <div className="max-h-48 overflow-y-auto border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-slate-800">
                <ul className="divide-y dark:divide-gray-600">
                  {storageStructure.stand.map((stand) => {
                    const deletable = isUnitDeletable(StorageType.Stand, stand.stand);
                    return (
                      <li key={stand.stand} className="p-3 flex justify-between items-center">
                        <span className="font-medium">Stand {stand.stand} ({stand.shelves.length} Raf)</span>
                        <div className="flex space-x-2">
                          <button onClick={() => handleOpenLocationEditModal(StorageType.Stand, stand.stand, stand.shelves.length)} className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400" title="Düzenle"><Edit size={16} /></button>
                          <div className="relative group">
                            <button onClick={() => handleOpenDeleteModal('location', { type: StorageType.Stand, id: stand.stand })} disabled={!deletable} className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 disabled:opacity-50" title="Sil"><Trash2 size={16} /></button>
                            {!deletable && (<div className="absolute bottom-full mb-2 w-48 p-2 text-xs text-white bg-gray-900 rounded-md shadow-lg opacity-0 group-hover:opacity-100">Bu standda klasörler bulunduğu için silinemez.</div>)}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <button onClick={() => addStorageUnit(StorageType.Stand)} className="mt-4 px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">Yeni Stand Ekle</button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSave} className="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 font-semibold">
            Ayarları Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};