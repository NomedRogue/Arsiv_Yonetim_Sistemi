// frontend/src/pages/Settings.tsx
import { DEFAULT_SETTINGS } from '@/constants';
import React, { useEffect, useState } from 'react';
import { useArchive } from '@/context/ArchiveContext';
import { handleApiError } from '@/lib/apiErrorHandler';
import {
  Settings as SettingsType,
  Department,
  Category,
  StorageType,
  KompaktUnitConfig,
} from '@/types';
import { Modal } from '@/components/Modal';
import { Edit, Trash2, HardDrive, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { toast } from '@/lib/toast';
import { deleteBackup, getBackups, backupDbToFolder, restoreDbFromBackup } from '@/api';

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
        className={`block w-full p-2 sm:text-sm border border-gray-300 rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-gray-200 disabled:opacity-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${type === 'time' ? 'pr-3' : unit ? 'pr-12' : ''}`}
        style={type === 'time' ? { textAlign: 'left' } : undefined}
      />
      {unit && type !== 'time' && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-gray-500 sm:text-sm dark:text-gray-400">{unit}</span>
        </div>
      )}
    </div>
  </div>
);

const FilePathInput: React.FC<{
  label: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBrowseClick: () => void;
}> = ({ label, id, value, onChange, onBrowseClick }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
    </label>
    <div className="flex rounded-md shadow-sm">
      <input
        type="text"
        name={id}
        id={id}
        value={value}
        onChange={onChange}
        className="flex-1 block p-2 sm:text-sm border border-gray-300 rounded-l-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <button
        type="button"
        onClick={onBrowseClick}
        className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 dark:border-gray-500 rounded-r-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
      >
        <span>Gözat...</span>
      </button>
    </div>
  </div>
);

// Accordion Section Component
const AccordionSection: React.FC<{
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, isOpen, onToggle, children }) => (
  <div className="bg-white dark:bg-archive-dark-panel rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-6 py-4 text-left flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
    >
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
      {isOpen ? (
        <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200" />
      ) : (
        <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200" />
      )}
    </button>
    <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
      <div className="p-6">
        {children}
      </div>
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
  } = useArchive();

  const [currentSettings, setCurrentSettings] = useState<SettingsType>(settings);

  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);

  // Load backup history on component mount
  useEffect(() => {
    const loadBackups = async () => {
      try {
        const response = await getBackups();
        setBackups(response.backups || []);
        setBackupFolder(response.folder || '');
      } catch (error) {
        handleApiError(error, 'Yedekler yüklenemedi');
      }
    };
    loadBackups();
  }, []);

  // Accordion states
  const [openSections, setOpenSections] = useState({
    measurements: true,  // Ölçü Tanımları - default açık
    system: false,       // Sistem Ayarları
    departments: false,  // Birim Yönetimi
    storage: false,      // Lokasyon Yönetimi
    backup: false        // Yedekleme Ayarları
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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
    sectionsPerFace: 2,
    shelvesPerSection: 5,
  };
  const [kompaktConfig, setKompaktConfig] = useState<KompaktUnitConfig>(initialKompaktConfig);

  const [isStandAddModalOpen, setStandAddModalOpen] = useState(false);
  const [standShelfCount, setStandShelfCount] = useState(5);

  const [isRestoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreFilename, setRestoreFilename] = useState('');

  const [isBackupDeleteModalOpen, setIsBackupDeleteModalOpen] = useState(false);
  const [pendingDeleteFilename, setPendingDeleteFilename] = useState('');

  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [backupFolder, setBackupFolder] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setCurrentSettings((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value,
    }));
  };

  const handleSave = async () => {
    await updateSettings(currentSettings);
  };

  const handleBrowseClick = async (fieldName: string) => {
    if (window.electronAPI?.openFolderDialog) {
      try {
        const selectedPath = await window.electronAPI.openFolderDialog();
        if (selectedPath) {
          setCurrentSettings((prev) => ({ ...prev, [fieldName]: selectedPath }));
        }
      } catch (error) {
        handleApiError(error, 'Klasör seçimi başarısız oldu.');
      }
    } else {
      toast.error('Klasör seçimi bu platformda desteklenmiyor.');
    }
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentDepartment((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenDepartmentModal = () => {
    setDepartmentModalMode('add');
    setCurrentDepartment({ name: '', category: Category.Idari });
    setEditingDepartmentId(null);
    setDepartmentModalOpen(true);
  };

  const handleEditDepartment = (dept: Department) => {
    setDepartmentModalMode('edit');
    setCurrentDepartment({ name: dept.name, category: dept.category });
    setEditingDepartmentId(dept.id);
    setDepartmentModalOpen(true);
  };

  const handleCloseDepartmentModal = () => {
    setDepartmentModalOpen(false);
    setCurrentDepartment({ name: '', category: Category.Idari });
    setEditingDepartmentId(null);
  };

  const handleDepartmentSubmit = async () => {
    if (!currentDepartment.name.trim()) {
      toast.error('Birim adı boş olamaz.');
      return;
    }

    if (departmentModalMode === 'add') {
      await addDepartment(currentDepartment);
    } else if (editingDepartmentId !== null) {
      const updatedDept: Department = { id: editingDepartmentId, ...currentDepartment };
      await updateDepartment(updatedDept);
    }
    handleCloseDepartmentModal();
  };

  const openDeleteModal = (type: 'department' | 'location', data: any) => {
    setItemToDelete({ type, data });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'department') {
        await deleteDepartment(itemToDelete.data.id);
      } else if (itemToDelete.type === 'location') {
        await deleteStorageUnit(itemToDelete.data.type, itemToDelete.data.id);
      }
    } catch (error: any) {
      toast.error(`Silme işlemi başarısız: ${error.message}`);
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const openLocationModal = (type: StorageType, id: number, currentShelfCount: number) => {
    setEditingLocation({ type, id, shelfCount: currentShelfCount });
    setNewShelfCount(currentShelfCount);
    setLocationModalOpen(true);
  };

  const handleLocationSubmit = async () => {
    if (!editingLocation) return;
    await updateStorageUnitShelves(editingLocation.type, editingLocation.id, newShelfCount);
    setLocationModalOpen(false);
    setEditingLocation(null);
  };

  const handleOpenRestoreModal = (filename: string) => {
    setRestoreFilename(filename);
    setRestoreModalOpen(true);
  };

  const openBackupDeleteModal = (filename: string) => {
    setPendingDeleteFilename(filename);
    setIsBackupDeleteModalOpen(true);
  };

  const closeBackupDeleteModal = () => {
    setIsBackupDeleteModalOpen(false);
    setPendingDeleteFilename('');
  };

  const handleConfirmBackupDelete = async () => {
    if (!pendingDeleteFilename) return;
    try {
      await deleteBackup(pendingDeleteFilename);
      setBackups((prev) => prev.filter((b) => b.filename !== pendingDeleteFilename));
      toast.success('Yedek dosyası silindi.');
    } catch (error: any) {
      toast.error(`Yedek silme başarısız: ${error.message}`);
    } finally {
      closeBackupDeleteModal();
    }
  };

  const handleServerSideBackup = async () => {
    try {
      await backupDbToFolder();
      toast.success('Sunucu tarafında yedekleme başarıyla tamamlandı.');
      // Yedek listesini yeniden yükle
      const response = await getBackups();
      setBackups(response.backups || []);
    } catch (error: any) {
      toast.error(`Yedekleme başarısız: ${error.message}`);
    }
  };

  // Kompakt ünite modal handlers
  const handleOpenKompaktModal = () => {
    setKompaktConfig(initialKompaktConfig);
    setKompaktAddModalOpen(true);
  };

  const handleCloseKompaktModal = () => {
    setKompaktAddModalOpen(false);
    setKompaktConfig(initialKompaktConfig);
  };

  const handleKompaktSubmit = async () => {
    await addStorageUnit(StorageType.Kompakt, kompaktConfig);
    handleCloseKompaktModal();
  };

  // Stand modal handlers
  const handleOpenStandModal = () => {
    setStandShelfCount(5);
    setStandAddModalOpen(true);
  };

  const handleCloseStandModal = () => {
    setStandAddModalOpen(false);
    setStandShelfCount(5);
  };

  const handleStandSubmit = async () => {
    // Stand için raf sayısı ile birlikte ekleme
    // Şimdilik basit stand ekleme, sonra useArchiveActions'ı güncelleyeceğiz
    await addStorageUnit(StorageType.Stand);
    handleCloseStandModal();
  };

  // Calculate derived values
  const backupFrequency = (currentSettings.backupFrequency ?? DEFAULT_SETTINGS.backupFrequency) as SettingsType['backupFrequency'];
  const backupTime = currentSettings.backupTime ?? DEFAULT_SETTINGS.backupTime;
  const backupRetention = Number(currentSettings.backupRetention ?? DEFAULT_SETTINGS.backupRetention);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <Modal isOpen={isDepartmentModalOpen} onClose={handleCloseDepartmentModal} title={departmentModalMode === 'add' ? 'Yeni Birim Ekle' : 'Birimi Düzenle'} onConfirm={handleDepartmentSubmit} confirmText="Kaydet" confirmColor="bg-status-blue">
        <div className="space-y-4">
          <div>
            <label htmlFor="department-name-input" className="block text-sm font-medium text-gray-800 dark:text-gray-200">Birim Adı</label>
            <input id="department-name-input" type="text" name="name" value={currentDepartment.name} onChange={handleDepartmentChange} className="mt-1 block w-full p-2 border rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-white transition-colors duration-300"/>
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

      <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Silme Onayı" onConfirm={handleConfirmDelete} confirmText="Evet, Sil" type="danger" showIcon>
        <p>Bu işlem geri alınamaz. Silmek istediğinizden emin misiniz?</p>
      </Modal>

      <Modal isOpen={isLocationModalOpen} onClose={() => setLocationModalOpen(false)} title="Raf Sayısını Düzenle" onConfirm={handleLocationSubmit} confirmText="Kaydet" confirmColor="bg-status-blue">
        <div>
          <label htmlFor="shelf-count-input" className="block text-sm font-medium text-gray-800 dark:text-gray-200">Raf Sayısı</label>
          <input id="shelf-count-input" type="number" min="1" value={newShelfCount} onChange={(e) => setNewShelfCount(Number(e.target.value))} className="mt-1 block w-full p-2 border rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-white transition-colors duration-300"/>
        </div>
      </Modal>

      <Modal isOpen={isBackupDeleteModalOpen} onClose={closeBackupDeleteModal} title="Yedek Silme Onayı" onConfirm={handleConfirmBackupDelete} confirmText="Evet, Sil" type="danger" showIcon>
        <p>
          <span className="font-bold text-red-600 dark:text-red-400">"{pendingDeleteFilename}"</span> isimli yedek dosyasını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
        </p>
      </Modal>

      <Modal isOpen={isRestoreModalOpen} onClose={() => setRestoreModalOpen(false)} title="Veritabanı Geri Yükleme" onConfirm={async () => {
        try {
          await restoreDbFromBackup(restoreFilename);
          toast.success('Veritabanı başarıyla geri yüklendi! Uygulama yeniden başlatılıyor...');
          setRestoreModalOpen(false);
          // Sayfayı yenile (restore sonrası)
          setTimeout(() => window.location.reload(), 1500);
        } catch (e: any) {
          toast.error(`Geri yükleme başarısız: ${e.message}`);
        }
      }} confirmText="Geri Yükle" type="danger" showIcon>
        <p>
          <span className="font-bold text-blue-600 dark:text-blue-400">"{restoreFilename}"</span> dosyasından veritabanını geri yüklemek istediğinizden emin misiniz? 
          <br /><br />
          <strong className="text-red-600 dark:text-red-400">Uyarı:</strong> Bu işlem mevcut tüm verileri silecek ve yedekteki verilerle değiştirecektir. Bu işlem geri alınamaz.
        </p>
      </Modal>

      {/* Kompakt Ünite Ekleme Modal */}
      <Modal isOpen={isKompaktAddModalOpen} onClose={handleCloseKompaktModal} title="Yeni Kompakt Ünite Ekle" onConfirm={handleKompaktSubmit} confirmText="Ünite Ekle" confirmColor="bg-blue-600">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Yüz Seçimi</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  checked={kompaktConfig.hasFaceA} 
                  onChange={(e) => setKompaktConfig(prev => ({...prev, hasFaceA: e.target.checked}))}
                  className="w-4 h-4 mr-2"
                />
                <span>A Yüzü</span>
              </label>
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  checked={kompaktConfig.hasFaceB} 
                  onChange={(e) => setKompaktConfig(prev => ({...prev, hasFaceB: e.target.checked}))}
                  className="w-4 h-4 mr-2"
                />
                <span>B Yüzü</span>
              </label>
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  checked={kompaktConfig.hasFaceGizli} 
                  onChange={(e) => setKompaktConfig(prev => ({...prev, hasFaceGizli: e.target.checked}))}
                  className="w-4 h-4 mr-2"
                />
                <span>Gizli Yüzü</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Yüz Başına Bölüm Sayısı</label>
              <input 
                type="number" 
                min="1" 
                max="10" 
                value={kompaktConfig.sectionsPerFace} 
                onChange={(e) => setKompaktConfig(prev => ({...prev, sectionsPerFace: Number(e.target.value)}))}
                className="mt-1 block w-full p-2 border rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-white transition-colors duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Bölüm Başına Raf Sayısı</label>
              <input 
                type="number" 
                min="1" 
                max="10" 
                value={kompaktConfig.shelvesPerSection} 
                onChange={(e) => setKompaktConfig(prev => ({...prev, shelvesPerSection: Number(e.target.value)}))}
                className="mt-1 block w-full p-2 border rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-white transition-colors duration-300"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Stand Ekleme Modal */}
      <Modal isOpen={isStandAddModalOpen} onClose={handleCloseStandModal} title="Yeni Stand Ekle" onConfirm={handleStandSubmit} confirmText="Stand Ekle" confirmColor="bg-blue-600">
        <div>
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Raf Sayısı</label>
          <input 
            type="number" 
            min="1" 
            max="20" 
            value={standShelfCount} 
            onChange={(e) => setStandShelfCount(Number(e.target.value))}
            className="mt-1 block w-full p-2 border rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-white"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Standın kaç rafa sahip olacağını belirleyin (1-20 arası)</p>
        </div>
      </Modal>

      {/* Ölçü Tanımları */}
      <AccordionSection
        title="Ölçü Tanımları"
        isOpen={openSections.measurements}
        onToggle={() => toggleSection('measurements')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SettingInput label="Kompakt Dolap Raf Genişliği" id="kompaktRafGenisligi" value={currentSettings.kompaktRafGenisligi} unit="cm" onChange={handleChange} />
          <SettingInput label="Stand Raf Genişliği" id="standRafGenisligi" value={currentSettings.standRafGenisligi} unit="cm" onChange={handleChange} />
          <SettingInput label="Dar Klasör Genişliği" id="darKlasorGenisligi" value={currentSettings.darKlasorGenisligi} unit="cm" onChange={handleChange} />
          <SettingInput label="Geniş Klasör Genişliği" id="genisKlasorGenisligi" value={currentSettings.genisKlasorGenisligi} unit="cm" onChange={handleChange} />
        </div>
      </AccordionSection>

      {/* Sistem Ayarları */}
      <AccordionSection
        title="Sistem Ayarları"
        isOpen={openSections.system}
        onToggle={() => toggleSection('system')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SettingInput label="PDF Boyut Limiti" id="pdfBoyutLimiti" value={currentSettings.pdfBoyutLimiti} unit="MB" onChange={handleChange} />
          <SettingInput label="Log Saklama Süresi" id="logSaklamaSuresi" value={currentSettings.logSaklamaSuresi} unit="Yıl" onChange={handleChange} />
          <FilePathInput label="PDF Kayıt Klasörü" id="pdfKayitKlasoru" value={currentSettings.pdfKayitKlasoru} onChange={handleChange} onBrowseClick={() => handleBrowseClick('pdfKayitKlasoru')} />
          <FilePathInput label="Excel Kayıt Klasörü" id="excelKayitKlasoru" value={currentSettings.excelKayitKlasoru} onChange={handleChange} onBrowseClick={() => handleBrowseClick('excelKayitKlasoru')} />
          <FilePathInput label="Yedekleme Klasörü" id="yedeklemeKlasoru" value={currentSettings.yedeklemeKlasoru} onChange={handleChange} onBrowseClick={() => handleBrowseClick('yedeklemeKlasoru')} />
          <SettingInput label="İade Uyarısı" id="iadeUyarisiGun" value={currentSettings.iadeUyarisiGun} unit="Gün Önce" onChange={handleChange} />
        </div>
      </AccordionSection>

      {/* Yedekleme Ayarları */}
      <AccordionSection
        title="Yedekleme Ayarları"
        isOpen={openSections.backup}
        onToggle={() => toggleSection('backup')}
      >
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Otomatik Yedekleme</h3>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                backupFrequency === 'Kapalı' 
                  ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' 
                  : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  backupFrequency === 'Kapalı' ? 'bg-gray-400' : 'bg-green-500 animate-pulse'
                }`}></div>
                {backupFrequency === 'Kapalı' ? 'Devre Dışı' : 'Aktif'}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="backupFrequency" className="block text-sm font-medium mb-1">Sıklık</label>
                <select id="backupFrequency" name="backupFrequency" value={backupFrequency} onChange={handleChange} className="w-full p-2 border rounded-md bg-white dark:bg-slate-600 dark:border-gray-500 dark:text-white">
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
          </div>

          <div>
            <h4 className="font-semibold mb-2">Yedek Geçmişi</h4>
            {backupFolder && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Yedekleme Konumu: <code className="bg-gray-100 dark:bg-slate-700 p-1 rounded">{backupFolder}</code></p>}
            {backups.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 p-4 border rounded-md">Kayıtlı yedek bulunamadı.</div>
            ) : (
              <div className="overflow-x-auto border rounded-md">
                <table className="min-w-full text-sm">
                  <thead className="text-left border-b dark:border-slate-700 bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="py-3 px-4 font-medium">Dosya</th>
                      <th className="py-3 px-4 font-medium">Tarih</th>
                      <th className="py-3 px-4 font-medium">Boyut</th>
                      <th className="py-3 px-4 font-medium">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((b) => (
                      <tr key={b.filename} className="border-b last:border-0 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4 font-medium">{b.filename}</td>
                        <td className="py-3 px-4">{new Date(b.iso).toLocaleString()}</td>
                        <td className="py-3 px-4">{(b.size / (1024 * 1024)).toFixed(2)} MB</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleOpenRestoreModal(b.filename)} 
                              className="px-3 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
                            >
                              Geri Yükle
                            </button>
                            <button 
                              onClick={() => openBackupDeleteModal(b.filename)} 
                              className="px-3 py-1 rounded-md bg-rose-600 text-white hover:bg-rose-700 text-sm"
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </AccordionSection>

      {/* Birim Yönetimi */}
      <AccordionSection
        title="Birim Yönetimi"
        isOpen={openSections.departments}
        onToggle={() => toggleSection('departments')}
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Birimler</h3>
            <button onClick={handleOpenDepartmentModal} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Yeni Birim Ekle
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-slate-800">
            {departments.map((dept) => (
              <div key={dept.id} className="flex justify-between items-center p-3 border-b last:border-0 dark:border-gray-700">
                <div>
                  <span className="font-medium">{dept.name}</span>
                  <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${dept.category === Category.Tibbi ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {dept.category === Category.Tibbi ? 'Tıbbi' : 'İdari'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEditDepartment(dept)} className="p-1 text-gray-600 hover:text-blue-600" title="Düzenle">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => openDeleteModal('department', dept)} className="p-1 text-gray-600 hover:text-red-600" title="Sil">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>

      {/* Lokasyon Yönetimi */}
      <AccordionSection
        title="Lokasyon Yönetimi"
        isOpen={openSections.storage}
        onToggle={() => toggleSection('storage')}
      >
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Kompakt Üniteler</h3>
              <button onClick={handleOpenKompaktModal} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">
                Ünite Ekle
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-slate-800">
              {storageStructure.kompakt?.map((unit) => {
                const canDelete = isUnitDeletable(StorageType.Kompakt, unit.unit);
                return (
                  <div key={unit.unit} className="flex justify-between items-center p-3 border-b last:border-0 dark:border-gray-700">
                    <span>Ünite {unit.unit}</span>
                    <div className="flex gap-2">
                      {canDelete ? (
                        <button onClick={() => openDeleteModal('location', { type: StorageType.Kompakt, id: unit.unit })} className="p-1 text-gray-600 hover:text-red-600" title="Sil">
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button disabled className="p-1 text-gray-400 cursor-not-allowed" title="İçinde klasör bulunan ünite silinemez">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Standlar</h3>
              <button onClick={handleOpenStandModal} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">
                Stand Ekle
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-slate-800">
              {storageStructure.stand?.map((unit) => {
                const canDelete = isUnitDeletable(StorageType.Stand, unit.stand);
                return (
                  <div key={unit.stand} className="flex justify-between items-center p-3 border-b last:border-0 dark:border-gray-700">
                    <span>Stand {unit.stand}</span>
                    <div className="flex gap-2">
                      {canDelete ? (
                        <button onClick={() => openDeleteModal('location', { type: StorageType.Stand, id: unit.stand })} className="p-1 text-gray-600 hover:text-red-600" title="Sil">
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button disabled className="p-1 text-gray-400 cursor-not-allowed" title="İçinde klasör bulunan stand silinemez">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* Kaydet Butonu */}
      <div className="flex justify-end">
        <button onClick={handleSave} className="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 font-semibold">
          Ayarları Kaydet
        </button>
      </div>
    </div>
  );
};

export default Settings;