import { DEFAULT_SETTINGS } from '@/constants';
import React, { useEffect, useState } from 'react';
import { useArchive } from '@/context/ArchiveContext';
import { handleApiError } from '@/lib/apiErrorHandler';
import { Settings as SettingsType, StorageType, Category } from './types';
import { getBackupFrequency, getBackupTime, getBackupRetention } from './utils';
import { 
  useBackupManagement, 
  useDepartmentManagement, 
  useStorageManagement, 
  useAccordionState 
} from './hooks';
import { SettingInput, FilePathInput, AccordionSection, UserManagement, UpdateManagement, ProfileSettings } from './components';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/Modal';
import { Edit, Trash2, HardDrive } from 'lucide-react';
import { toast } from '@/lib/toast';

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
  const [isTokenEditable, setIsTokenEditable] = useState(false);

  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);


  // Custom hooks for state management
  const { openSections, toggleSection } = useAccordionState();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const {
    backups,
    backupFolder,
    isRestoreModalOpen,
    restoreFilename,
    isBackupDeleteModalOpen,
    pendingDeleteFilename,
    handleOpenRestoreModal,
    handleRestoreBackup,
    openBackupDeleteModal,
    closeBackupDeleteModal,
    handleConfirmBackupDelete,
    handleServerSideBackup,
    setRestoreModalOpen,
  } = useBackupManagement();

  const {
    isDepartmentModalOpen,
    departmentModalMode,
    currentDepartment,
    editingDepartmentId,
    handleDepartmentChange,
    handleOpenDepartmentModal,
    handleEditDepartment,
    handleCloseDepartmentModal,
    handleDepartmentSubmit,
  } = useDepartmentManagement({
    departments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
  });

  const {
    isDeleteModalOpen,
    itemToDelete,
    openDeleteModal,
    handleConfirmDelete,
    setDeleteModalOpen,
    isLocationModalOpen,
    editingLocation,
    newShelfCount,
    openLocationModal,
    handleLocationSubmit,
    setNewShelfCount,
    setLocationModalOpen,
    isKompaktAddModalOpen,
    kompaktConfig,
    handleOpenKompaktModal,
    handleCloseKompaktModal,
    handleKompaktSubmit,
    setKompaktConfig,
    isStandAddModalOpen,
    standShelfCount,
    handleOpenStandModal,
    handleCloseStandModal,
    handleStandSubmit,
    setStandShelfCount,
  } = useStorageManagement({
    addStorageUnit,
    deleteStorageUnit,
    updateStorageUnitShelves,
  });

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

  // Platform based default paths
  useEffect(() => {
    // Cast to any to avoid type checking issues with the updated interface
    const api = window.electronAPI as any;
    if (api?.paths?.userData) {
      const userData = api.paths.userData;
      // Default path fallback logic for display
      const platformDefaults = {
        pdfKayitKlasoru: `${userData}\\PDFs`,
        excelKayitKlasoru: `${userData}\\Excels`,
        yedeklemeKlasoru: `${userData}\\Backups`
      };

      setCurrentSettings(prev => ({
        ...prev,
        pdfKayitKlasoru: prev.pdfKayitKlasoru || platformDefaults.pdfKayitKlasoru,
        excelKayitKlasoru: prev.excelKayitKlasoru || platformDefaults.excelKayitKlasoru,
        yedeklemeKlasoru: prev.yedeklemeKlasoru || platformDefaults.yedeklemeKlasoru
      }));
    }
  }, [settings]); // settings yüklendiğinde çalışır

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

  // Calculate derived values using utility functions
  const backupFrequency = getBackupFrequency(currentSettings);
  const backupTime = getBackupTime(currentSettings);
  const backupRetention = getBackupRetention(currentSettings);

  return (
    <div className="p-3 xl:p-5 space-y-3 xl:space-y-5 max-w-5xl xl:max-w-6xl mx-auto">
      <Modal isOpen={isDepartmentModalOpen} onClose={handleCloseDepartmentModal} title={departmentModalMode === 'add' ? 'Yeni Birim Ekle' : 'Birimi Düzenle'} onConfirm={handleDepartmentSubmit} confirmText="Kaydet" confirmColor="bg-teal-600">
        <div className="space-y-3 xl:space-y-4">
          <div>
            <label htmlFor="department-name-input" className="block text-xs xl:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Birim Adı</label>
            <input id="department-name-input" type="text" name="name" value={currentDepartment.name} onChange={handleDepartmentChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-xs xl:text-sm p-1.5 xl:p-2 bg-white transition-colors duration-200"/>
          </div>
          <div>
            <label htmlFor="department-code-input" className="block text-xs xl:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Birim Kodu</label>
            <input id="department-code-input" type="text" name="code" value={currentDepartment.code} onChange={handleDepartmentChange} placeholder="birim kodunu giriniz" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-xs xl:text-sm p-1.5 xl:p-2 bg-white transition-colors duration-200 uppercase placeholder:text-[10px] xl:placeholder:text-xs placeholder:text-gray-400 placeholder:lowercase"/>
          </div>
          <div>
            <label className="block text-xs xl:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Kategori</label>
            <div className="grid grid-cols-2 gap-3 xl:gap-4">
              <label className={`
                relative flex cursor-pointer rounded-lg px-3 py-3 xl:px-5 xl:py-4 focus:outline-none border transition-all duration-200
                ${currentDepartment.category === Category.Idari 
                  ? 'bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800' 
                  : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'}
              `}>
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center">
                    <div className="text-xs xl:text-sm">
                      <p className={`font-medium ${currentDepartment.category === Category.Idari ? 'text-teal-900 dark:text-teal-100' : 'text-gray-900 dark:text-gray-100'}`}>
                        İdari
                      </p>
                    </div>
                  </div>
                  <div className={`shrink-0 text-teal-600 ${currentDepartment.category === Category.Idari ? 'opacity-100' : 'opacity-0'}`}>
                    <svg className="h-5 w-5 xl:h-6 xl:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 12l3 3 5-5"></path>
                    </svg>
                  </div>
                </div>
                <input type="radio" name="category" value={Category.Idari} checked={currentDepartment.category === Category.Idari} onChange={handleDepartmentChange} className="sr-only"/>
              </label>

              <label className={`
                relative flex cursor-pointer rounded-lg px-3 py-3 xl:px-5 xl:py-4 focus:outline-none border transition-all duration-200
                ${currentDepartment.category === Category.Tibbi 
                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                  : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'}
              `}>
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center">
                    <div className="text-xs xl:text-sm">
                      <p className={`font-medium ${currentDepartment.category === Category.Tibbi ? 'text-green-900 dark:text-green-100' : 'text-gray-900 dark:text-gray-100'}`}>
                        Tıbbi
                      </p>
                    </div>
                  </div>
                  <div className={`shrink-0 text-green-600 ${currentDepartment.category === Category.Tibbi ? 'opacity-100' : 'opacity-0'}`}>
                    <svg className="h-5 w-5 xl:h-6 xl:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 12l3 3 5-5"></path>
                    </svg>
                  </div>
                </div>
                <input type="radio" name="category" value={Category.Tibbi} checked={currentDepartment.category === Category.Tibbi} onChange={handleDepartmentChange} className="sr-only"/>
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
          <label htmlFor="shelf-count-input" className="block text-xs xl:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Raf Sayısı</label>
          <input id="shelf-count-input" type="number" min="1" value={newShelfCount} onChange={(e) => setNewShelfCount(Number(e.target.value))} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-xs xl:text-sm p-1.5 xl:p-2 bg-white transition-colors duration-200"/>
        </div>
      </Modal>

      <Modal isOpen={isBackupDeleteModalOpen} onClose={closeBackupDeleteModal} title="Yedek Silme Onayı" onConfirm={handleConfirmBackupDelete} confirmText="Evet, Sil" type="danger" showIcon>
        <p>
          <span className="font-bold text-red-600 dark:text-red-400">"{pendingDeleteFilename}"</span> isimli yedek dosyasını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
        </p>
      </Modal>

      <Modal isOpen={isRestoreModalOpen} onClose={() => setRestoreModalOpen(false)} title="Veritabanı Geri Yükleme" onConfirm={handleRestoreBackup} confirmText="Geri Yükle" type="danger" showIcon>
        <p>
          <span className="font-bold text-blue-600 dark:text-blue-400">"{restoreFilename}"</span> dosyasından veritabanını geri yüklemek istediğinizden emin misiniz? 
          <br /><br />
          <strong className="text-red-600 dark:text-red-400">Uyarı:</strong> Bu işlem mevcut tüm verileri silecek ve yedekteki verilerle değiştirecektir. Bu işlem geri alınamaz.
        </p>
      </Modal>

      {/* Kompakt Ünite Ekleme Modal */}
      <Modal isOpen={isKompaktAddModalOpen} onClose={handleCloseKompaktModal} title="Yeni Kompakt Ünite Ekle" onConfirm={handleKompaktSubmit} confirmText="Ünite Ekle" confirmColor="bg-teal-600">
        <div className="space-y-4 xl:space-y-6">
          <div>
            <label className="block text-xs xl:text-sm font-medium text-slate-900 dark:text-slate-100 mb-2 xl:mb-3">Yüz Seçimi</label>
            <div className="grid grid-cols-3 gap-2 xl:gap-3">
              {[
                { id: 'faceA', label: 'A Yüzü', checked: kompaktConfig.hasFaceA, set: (v: boolean) => setKompaktConfig(prev => ({...prev, hasFaceA: v})) },
                { id: 'faceB', label: 'B Yüzü', checked: kompaktConfig.hasFaceB, set: (v: boolean) => setKompaktConfig(prev => ({...prev, hasFaceB: v})) },
                { id: 'faceGizli', label: 'Gizli Yüz', checked: kompaktConfig.hasFaceGizli, set: (v: boolean) => setKompaktConfig(prev => ({...prev, hasFaceGizli: v})) }
              ].map(face => (
                <label key={face.id} className={`
                  flex flex-col items-center justify-center p-2 xl:p-3 rounded-lg border cursor-pointer transition-all duration-200
                  ${face.checked 
                    ? 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-300' 
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-750'}
                `}>
                  <input type="checkbox" checked={face.checked} onChange={(e) => face.set(e.target.checked)} className="sr-only" />
                  <span className={`w-4 h-4 xl:w-5 xl:h-5 mb-1.5 xl:mb-2 rounded border flex items-center justify-center ${face.checked ? 'bg-teal-500 border-teal-500 text-white' : 'border-gray-300 bg-white'}`}>
                    {face.checked && <svg className="w-2.5 h-2.5 xl:w-3 xl:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </span>
                  <span className="text-xs xl:text-sm font-medium">{face.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 xl:gap-4">
            <div>
              <label className="block text-xs xl:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Yüz Başına Bölüm</label>
              <input 
                type="number" 
                min="1" 
                max="10" 
                value={kompaktConfig.sectionsPerFace} 
                onChange={(e) => setKompaktConfig(prev => ({...prev, sectionsPerFace: Number(e.target.value)}))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-xs xl:text-sm p-2 xl:p-2.5 bg-white transition-colors"
                placeholder="Örn: 3"
              />
            </div>
            <div>
              <label className="block text-xs xl:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bölüm Başına Raf</label>
              <input 
                type="number" 
                min="1" 
                max="10" 
                value={kompaktConfig.shelvesPerSection} 
                onChange={(e) => setKompaktConfig(prev => ({...prev, shelvesPerSection: Number(e.target.value)}))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-xs xl:text-sm p-2 xl:p-2.5 bg-white transition-colors"
                placeholder="Örn: 5"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Stand Ekleme Modal */}
      <Modal isOpen={isStandAddModalOpen} onClose={handleCloseStandModal} title="Yeni Stand Ekle" onConfirm={handleStandSubmit} confirmText="Stand Ekle" confirmColor="bg-teal-600">
        <div className="space-y-3">
          <div>
            <label className="block text-xs xl:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Raf Sayısı</label>
            <div className="relative rounded-md shadow-sm">
              <input 
                type="number" 
                min="1" 
                max="20" 
                value={standShelfCount} 
                onChange={(e) => setStandShelfCount(Number(e.target.value))}
                className="block w-full rounded-md border-gray-300 focus:border-teal-500 focus:ring-teal-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-xs xl:text-sm p-2 xl:p-2.5 pr-12 bg-white"
                placeholder="5"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-500 text-xs xl:text-sm">Adet</span>
              </div>
            </div>
          </div>
          <p className="text-xs xl:text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 p-2 xl:p-3 rounded border border-gray-100 dark:border-slate-700">
            Stand için toplam raf sayısını belirleyin (1-20 arası). Standart standlar genelde 5-6 raflıdır.
          </p>
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
      {isAdmin && (
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
      )}

      {/* Yedekleme Ayarları */}
      {isAdmin && (
        <AccordionSection
          title="Yedekleme Ayarları"
          isOpen={openSections.backup}
          onToggle={() => toggleSection('backup')}
        >
          <div className="space-y-4 xl:space-y-6">
            {/* Bilgilendirme Kutusu */}
            <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-3 xl:p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-4 h-4 xl:w-5 xl:h-5 text-blue-600 dark:text-blue-400 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-xs xl:text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">Tam Yedekleme Hakkında</h4>
                  <p className="text-xs xl:text-sm text-blue-800 dark:text-blue-300">
                    Yedeklemeler artık <strong>veritabanı + PDF + Excel dosyalarını</strong> içeren tam yedek olarak alınmaktadır. 
                    Geri yükleme yaptığınızda tüm verileriniz ve dosyalarınız geri gelecektir.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm xl:text-base">Otomatik Yedekleme</h3>
                <div className={`flex items-center gap-2 px-2 py-0.5 xl:px-3 xl:py-1 rounded-full text-xs xl:text-sm ${
                  backupFrequency === 'Kapalı' 
                    ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' 
                    : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                }`}>
                  <div className={`w-1.5 h-1.5 xl:w-2 xl:h-2 rounded-full ${
                    backupFrequency === 'Kapalı' ? 'bg-gray-400' : 'bg-green-500 animate-pulse'
                  }`}></div>
                  {backupFrequency === 'Kapalı' ? 'Devre Dışı' : 'Aktif'}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 xl:gap-4">
                <div>
                  <label htmlFor="backupFrequency" className="block text-xs xl:text-sm font-medium mb-1">Sıklık</label>
                  <select id="backupFrequency" name="backupFrequency" value={backupFrequency} onChange={handleChange} className="w-full p-1.5 xl:p-2 border rounded-md bg-white dark:bg-slate-600 dark:border-gray-500 dark:text-white text-xs xl:text-sm">
                    <option value="Kapalı">Kapalı</option>
                    <option value="Günlük">Günlük</option>
                    <option value="Haftalık">Haftalık</option>
                  </select>
                </div>
                <SettingInput label="Saat" id="backupTime" value={backupTime} type="time" onChange={handleChange as any} />
                <SettingInput label="Tutulacak Yedek Sayısı" id="backupRetention" value={backupRetention} type="number" onChange={handleChange as any} />
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <button onClick={handleServerSideBackup} className="inline-flex items-center gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-all text-xs xl:text-sm" title="Ayarlar > Yedekleme Klasörü'ne kopyalar">
                  <HardDrive className="w-4 h-4" /> Sunucuda Yedekle
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-sm xl:text-base">Yedek Geçmişi</h4>
              {backupFolder && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Yedekleme Konumu: <code className="bg-gray-100 dark:bg-slate-700 p-1 rounded">{backupFolder}</code></p>}
              {backups.length === 0 ? (
                <div className="text-xs xl:text-sm text-gray-500 dark:text-gray-400 p-4 border rounded-md">Kayıtlı yedek bulunamadı.</div>
              ) : (
                <div className="overflow-x-auto border rounded-md">
                  <table className="min-w-full text-xs xl:text-sm">
                    <thead className="text-left border-b dark:border-slate-700 bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="py-2 px-3 xl:py-3 xl:px-4 font-medium">Dosya</th>
                        <th className="py-2 px-3 xl:py-3 xl:px-4 font-medium">Tarih</th>
                        <th className="py-2 px-3 xl:py-3 xl:px-4 font-medium">Boyut</th>
                        <th className="py-2 px-3 xl:py-3 xl:px-4 font-medium">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backups.map((b) => (
                        <tr key={b.filename} className="border-b last:border-0 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="py-2 px-3 xl:py-3 xl:px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{b.filename}</span>
                              {b.type === 'full' && (
                                <span className="px-1.5 py-0.5 text-[10px] xl:text-xs font-semibold text-white bg-teal-600 rounded">
                                  TAM YEDEK
                                </span>
                              )}
                              {b.type === 'database' && (
                                <span className="px-1.5 py-0.5 text-[10px] xl:text-xs font-semibold text-white bg-teal-600 rounded">
                                  SADECE VERİTABANI
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 xl:py-3 xl:px-4">{new Date(b.iso).toLocaleString()}</td>
                          <td className="py-2 px-3 xl:py-3 xl:px-4">{(b.size / (1024 * 1024)).toFixed(2)} MB</td>
                          <td className="py-2 px-3 xl:py-3 xl:px-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleOpenRestoreModal(b.filename)} 
                                className="px-2 py-1 xl:px-3 rounded-md bg-teal-600 text-white hover:bg-teal-700 text-xs xl:text-sm shadow-sm transition-colors"
                                title={b.type === 'full' ? 'Veritabanı + PDF + Excel dosyalarını geri yükle' : 'Sadece veritabanını geri yükle'}
                              >
                                Geri Yükle
                              </button>
                              <button 
                                onClick={() => openBackupDeleteModal(b.filename)} 
                                className="px-2 py-1 xl:px-3 rounded-md bg-red-600 text-white hover:bg-red-700 text-xs xl:text-sm shadow-sm transition-colors"
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
      )}  {/* Birim Yönetimi ve Lokasyon Yönetimi */}
      <AccordionSection
        title="Birim Yönetimi"
        isOpen={openSections.departments}
        onToggle={() => toggleSection('departments')}
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm xl:text-base">Birimler</h3>
            <button onClick={handleOpenDepartmentModal} className="px-3 py-1.5 xl:px-4 xl:py-2 text-xs xl:text-sm text-white bg-teal-600 rounded-md hover:bg-teal-700">
              Yeni Birim Ekle
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-slate-800">
            {(departments || []).map((dept) => (
              <div key={dept.id} className="flex justify-between items-center p-2 xl:p-3 border-b last:border-0 dark:border-gray-700">
                <div>
                  <span className="font-medium text-xs xl:text-sm">{dept.name}</span>
                  <span className={`ml-2 text-[10px] xl:text-xs px-2 py-0.5 rounded-full ${dept.category === Category.Tibbi ? 'bg-green-100 text-green-800' : 'bg-teal-100 text-teal-800'}`}>
                    {dept.category === Category.Tibbi ? 'Tıbbi' : 'İdari'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEditDepartment(dept)} className="p-1 text-gray-600 hover:text-blue-600" title="Düzenle">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => openDeleteModal('department', dept)} className="p-1 text-gray-600 hover:text-red-600" title="Sil">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Lokasyon Yönetimi"
        isOpen={openSections.storage}
        onToggle={() => toggleSection('storage')}
      >
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-sm xl:text-base">Kompakt Üniteler</h3>
              <button onClick={handleOpenKompaktModal} className="px-3 py-1.5 xl:px-4 xl:py-2 text-xs xl:text-sm text-white bg-teal-600 rounded-md hover:bg-teal-700">
                Ünite Ekle
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-slate-800">
              {storageStructure.kompakt?.map((unit) => {
                const canDelete = isUnitDeletable(StorageType.Kompakt, unit.unit);
                return (
                  <div key={unit.unit} className="flex justify-between items-center p-2 xl:p-3 border-b last:border-0 dark:border-gray-700">
                    <span className="text-xs xl:text-sm">Ünite {unit.unit}</span>
                    <div className="flex gap-2">
                      {canDelete ? (
                        <button onClick={() => openDeleteModal('location', { type: StorageType.Kompakt, id: unit.unit })} className="p-1 text-gray-600 hover:text-red-600" title="Sil">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button disabled className="p-1 text-gray-400 cursor-not-allowed" title="İçinde klasör bulunan ünite silinemez">
                          <Trash2 className="w-4 h-4" />
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
              <h3 className="font-semibold text-sm xl:text-base">Standlar</h3>
              <button onClick={handleOpenStandModal} className="px-3 py-1.5 xl:px-4 xl:py-2 text-xs xl:text-sm text-white bg-teal-600 rounded-md hover:bg-teal-700">
                Stand Ekle
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-slate-800">
              {storageStructure.stand?.map((unit) => {
                const canDelete = isUnitDeletable(StorageType.Stand, unit.stand);
                return (
                  <div key={unit.stand} className="flex justify-between items-center p-2 xl:p-3 border-b last:border-0 dark:border-gray-700">
                    <span className="text-xs xl:text-sm">Stand {unit.stand}</span>
                    <div className="flex gap-2">
                      {canDelete ? (
                        <button onClick={() => openDeleteModal('location', { type: StorageType.Stand, id: unit.stand })} className="p-1 text-gray-600 hover:text-red-600" title="Sil">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button disabled className="p-1 text-gray-400 cursor-not-allowed" title="İçinde klasör bulunan stand silinemez">
                          <Trash2 className="w-4 h-4" />
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

      {/* Profil Ayarları */}
      <AccordionSection
        title="Profilim"
        isOpen={openSections.profile}
        onToggle={() => toggleSection('profile')}
      >
        <ProfileSettings />
      </AccordionSection>

      {/* Kullanıcı Yönetimi */}
      {isAdmin && (
        <AccordionSection
            title="Kullanıcı Yönetimi"
            isOpen={openSections.users}
            onToggle={() => toggleSection('users')}
        >
            <UserManagement />
        </AccordionSection>
      )}

      {/* Güncelleme Yönetimi */}
      {isAdmin && (
      <AccordionSection
        title="Güncelleme Yönetimi"
        isOpen={openSections.updates}
        onToggle={() => toggleSection('updates')}
      >
        {isAdmin && (
          <div className="mb-6 border-b pb-6 dark:border-gray-700">
            <SettingInput 
              label={`GitHub Access Token ${!isTokenEditable ? '(Korumalı - Düzenlemek için Çift Tıklayın)' : ''}`}
              id="githubToken" 
              type="text"
              value={currentSettings.githubToken || ''} 
              onChange={handleChange}
              readOnly={!isTokenEditable}
              onDoubleClick={() => setIsTokenEditable(true)}
              onBlur={() => setIsTokenEditable(false)}
              className={!isTokenEditable ? "opacity-60 cursor-pointer bg-gray-50 select-none" : ""}
            />
            <p className="mt-2 text-xs xl:text-sm text-gray-500 dark:text-gray-400">
              <strong>Not:</strong> Eğer uygulamanız özel bir (private) GitHub deposunda barınıyorsa, güncellemeleri alabilmek için buraya bir "Personal Access Token" girmelisiniz.
            </p>
          </div>
        )}
        <UpdateManagement />
      </AccordionSection>
      )}

      {/* Kaydet Butonu */}
      <div className="flex justify-end pt-4">
        <button onClick={handleSave} className="px-4 py-2 xl:px-6 xl:py-2.5 text-white bg-teal-600 rounded-md hover:bg-teal-700 font-semibold text-xs xl:text-sm transition-all duration-300">
          Ayarları Kaydet
        </button>
      </div>
    </div>
  );
};

export default Settings;
