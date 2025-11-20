import React, { useMemo, useState, useEffect, useCallback, memo } from 'react';
import { useArchive } from '@/context/ArchiveContext';
import { openFileWithSystem } from '@/lib/fileUtils';
import { Category, Folder, FolderStatus, Checkout, CheckoutStatus } from '@/types';
import { FileText, FileSpreadsheet, Edit, FileOutput, RotateCcw, Trash2, ChevronLeft, ChevronRight, Loader2, Search as SearchIcon } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { CheckoutModal } from '@/components/CheckoutModal';
import { Modal } from '@/components/Modal';
import { toast } from '@/lib/toast';
import { handleApiError } from '@/lib/apiErrorHandler';
import { RETENTION_CODES } from '@/constants';
import * as apiService from '@/api';

// Vite proxy kullan - /api otomatik olarak http://localhost:3001'e yönlendirilecek  
const api = (p: string) => `/api${p.startsWith('/') ? '' : '/'}${p}`;

// API URL helper - production'da doğrudan backend'e bağlan
const getApiUrl = (path: string) => {
  const baseUrl = import.meta.env.DEV ? '/api' : 'http://localhost:3001/api';
  return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
};

// Memoized FolderRow component for better performance
interface FolderRowProps {
  folder: Folder;
  statusColor: 'green' | 'yellow' | 'red' | 'blue' | 'orange' | 'gray';
  departmentName: string;
  categoryColor: 'green' | 'yellow' | 'red' | 'blue' | 'orange' | 'gray';
  onEdit: () => void;
  onCheckout: () => void;
  onReturn: () => void;
  onDelete: () => void;
}

const FolderRow = React.memo<FolderRowProps>(({ 
  folder, 
  statusColor, 
  departmentName, 
  categoryColor,
  onEdit, 
  onCheckout, 
  onReturn, 
  onDelete 
}) => {
  const locationText = useMemo(() => {
    return folder.location.storageType === 'Kompakt'
      ? `Ünite ${folder.location.unit} - ${folder.location.face} - ${folder.location.section}.Bölüm - ${folder.location.shelf}.Raf`
      : `Stand ${folder.location.stand} - ${folder.location.shelf}.Raf`;
  }, [folder.location]);

  return (
    <div className="p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50 transition-all duration-300 hover:shadow-xl hover:border-gray-400 dark:hover:border-gray-500">
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Badge text={folder.category} color={categoryColor} />
            <h4 className="font-bold text-lg">
              {departmentName} - {folder.subject}
            </h4>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
            <span><strong>Dosya Kodu:</strong> {folder.fileCode}</span>
            <span><strong>Dosya Yılı:</strong> {folder.fileYear}</span>
            <span><strong>Dosya Sayısı:</strong> {folder.fileCount}</span>
            <span><strong>Saklama:</strong> {folder.retentionPeriod}-{folder.retentionCode}</span>
            {folder.clinic && <span><strong>Klinik:</strong> {folder.clinic}</span>}
          </div>
          {folder.specialInfo && (
            <div className="text-sm mt-1 text-gray-500 dark:text-gray-400">
              <strong>Özel Bilgi:</strong> {folder.specialInfo}
            </div>
          )}
          <div className="text-sm mt-1">
            <strong>Lokasyon:</strong> {locationText}
          </div>
          <div className="mt-2">
            <strong>Durum: </strong>
            <Badge text={folder.status} color={statusColor} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {folder.pdfPath && (
            <button
              title="PDF Görüntüle"
              onClick={() => openFileWithSystem(folder.pdfPath!, 'pdf')}
              className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 transition-colors shadow-sm hover:shadow"
            >
              <FileText size={18} />
            </button>
          )}
          {folder.excelPath && (
            <button
              title="Excel Aç"
              onClick={() => openFileWithSystem(folder.excelPath!, 'excel')}
              className="p-2 bg-green-100 text-green-600 rounded-md hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900 transition-colors shadow-sm hover:shadow"
            >
              <FileSpreadsheet size={18} />
            </button>
          )}
          <button
            title="Düzenle"
            onClick={onEdit}
            className="p-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900 transition-colors"
          >
            <Edit size={16} />
          </button>

          {folder.status === FolderStatus.Arsivde && (
            <button
              title="Çıkış Ver"
              onClick={onCheckout}
              className="p-2 bg-orange-100 text-orange-600 rounded-md hover:bg-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:hover:bg-orange-900 transition-colors"
            >
              <FileOutput size={16} />
            </button>
          )}

          {folder.status === FolderStatus.Cikista && (
            <button
              title="İade Al"
              onClick={onReturn}
              className="p-2 bg-green-100 text-green-600 rounded-md hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900 transition-colors"
            >
              <RotateCcw size={16} />
            </button>
          )}

          <button
            title="Sil"
            onClick={onDelete}
            className="p-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});

FolderRow.displayName = 'FolderRow';

interface Props {
  onEditFolder: (id: number) => void;
}

export const FolderList: React.FC<Props> = ({ onEditFolder }) => {
  const {
    loading: contextLoading,
    getDepartmentName,
    departments,
    addCheckout,
    getCheckoutsForFolder,
    returnCheckout,
    deleteFolder,
    refresh,
  } = useArchive();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Server-side pagination için state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Gelişmiş arama state'leri
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState({
    general: '',
    category: 'Tümü',
    departmentId: 'Tümü',
    clinic: '',
    fileCode: '',
    subject: '',
    specialInfo: '',
    startYear: '',
    endYear: '',
    retentionCode: 'Tümü',
    status: 'Tümü', // Durum filtresi
  });

  const [isCheckoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedFolderForCheckout, setSelectedFolderForCheckout] = useState<Folder | null>(null);

  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedFolderToDelete, setSelectedFolderToDelete] = useState<Folder | null>(null);

  // Server-side pagination: API'den veri çek
  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      const baseUrl = import.meta.env.DEV ? '/api' : 'http://localhost:3001/api';
      
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
      });

      // Arama kriterleri ekle
      Object.entries(searchCriteria).forEach(([key, value]) => {
        if (value && value !== 'Tümü') {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`${baseUrl}/folders?${params.toString()}`);
      const data = await response.json();
      
      setFolders(Array.isArray(data.folders) ? data.folders : []);
      setTotalItems(data.total || 0);
    } catch (error) {
      toast.error('Klasörler yüklenirken hata oluştu');
      console.error('Fetch folders error:', error);
      setFolders([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchCriteria]);

  // Sayfa değiştiğinde veri çek
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // SSE listener: Klasör değişikliklerini dinle ve otomatik refresh yap
  useEffect(() => {
    const baseUrl = import.meta.env.DEV ? '' : 'http://localhost:3001';
    const eventSource = new EventSource(`${baseUrl}/api/events`);
    
    const handleFolderChange = () => {
      // Klasör eklendi, güncellendi, silindi veya imha edildi - listeyi yenile
      fetchFolders();
    };
    
    eventSource.addEventListener('folder_created', handleFolderChange);
    eventSource.addEventListener('folder_updated', handleFolderChange);
    eventSource.addEventListener('folder_deleted', handleFolderChange);
    eventSource.addEventListener('checkout_created', handleFolderChange);
    eventSource.addEventListener('checkout_updated', handleFolderChange);
    
    return () => {
      eventSource.close();
    };
  }, [fetchFolders]);

  // Optimized memoized callbacks
  const handleOpenCheckoutModal = useCallback((folder: Folder) => {
    setSelectedFolderForCheckout(folder);
    setCheckoutModalOpen(true);
  }, []);

  const handleCloseCheckoutModal = useCallback(() => {
    setSelectedFolderForCheckout(null);
    setCheckoutModalOpen(false);
  }, []);

  const handleConfirmCheckout = useCallback(async (data: Omit<Checkout, 'id' | 'status' | 'checkoutDate'>) => {
    try {
      // Direkt API call - context bypass
      const newCheckout = { ...data, id: Date.now(), checkoutDate: new Date(), status: CheckoutStatus.Cikista };
      const folder = folders.find(f => f.id === data.folderId);
      
      if (!folder) {
        toast.error('Çıkış yapılacak klasör bulunamadı.');
        return;
      }
      
      const updatedFolder = { ...folder, status: FolderStatus.Cikista, updatedAt: new Date() };
      
      await apiService.createCheckout(newCheckout);
      await apiService.updateFolder(updatedFolder);
      
      toast.success('Çıkış verildi.');
      handleCloseCheckoutModal();
      await fetchFolders(); // Listeyi yenile
    } catch (e: any) {
      toast.error(`Çıkış işlemi kaydedilemedi: ${e.message}`);
    }
  }, [folders, handleCloseCheckoutModal, fetchFolders]);

  const handleReturnFolder = useCallback(async (folderId: number) => {
    try {
      // Direkt API'den aktif checkout'u al
      const checkouts = await apiService.getActiveCheckouts();
      const active = checkouts.find(c => c.folderId === folderId && c.status === CheckoutStatus.Cikista);
      
      if (!active) {
        toast.info('Bu klasör için aktif bir çıkış bulunamadı.');
        return;
      }
      
      // İade işlemi
      const folder = folders.find(f => f.id === folderId);
      if (!folder) {
        toast.error('Klasör bulunamadı.');
        return;
      }
      
      const updatedCheckout = { ...active, status: CheckoutStatus.IadeEdildi, actualReturnDate: new Date() };
      const updatedFolder = { ...folder, status: FolderStatus.Arsivde, updatedAt: new Date() };
      
      await apiService.updateCheckout(updatedCheckout);
      await apiService.updateFolder(updatedFolder);
      
      toast.success('Klasör iade alındı.');
      await fetchFolders(); // Listeyi yenile
    } catch (e: any) {
      toast.error(`İade işlemi başarısız: ${e.message}`);
    }
  }, [folders, fetchFolders]);

  const askDelete = useCallback((folder: Folder) => {
    setSelectedFolderToDelete(folder);
    setDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (selectedFolderToDelete) {
      try {
        // Direkt API call - context bypass
        await apiService.removeFolder(selectedFolderToDelete.id);
        toast.success('Klasör ve ilişkili kayıtlar silindi.');
        
        // Eğer silinen son item'dı ve sayfa > 1, bir önceki sayfaya dön
        if (folders.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          await fetchFolders();
        }
      } catch (e: any) {
        toast.error(`Klasör silinemedi: ${e.message}`);
      }
    }
    setDeleteModalOpen(false);
    setSelectedFolderToDelete(null);
  }, [selectedFolderToDelete, folders.length, currentPage, fetchFolders]);

  const statusColor = (st: FolderStatus) =>
    st === FolderStatus.Arsivde ? 'green' : st === FolderStatus.Cikista ? 'yellow' : 'red';

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="h-full flex flex-col p-6">
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={handleCloseCheckoutModal}
        folder={selectedFolderForCheckout}
        onConfirm={handleConfirmCheckout}
      />

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Klasörü Sil"
        onConfirm={confirmDelete}
        confirmText="Sil"
        type="danger"
        showIcon
      >
        {selectedFolderToDelete ? (
          <p>
            <span className="font-bold">{selectedFolderToDelete.subject}</span> klasörünü kalıcı
            olarak silmek istiyor musunuz? Bu işlem geri alınamaz.
          </p>
        ) : null}
      </Modal>

      <div className="flex flex-col h-full bg-white dark:bg-archive-dark-panel p-6 rounded-xl shadow-lg transition-colors duration-300">
        <h2 className="text-2xl font-bold mb-4">Arşiv</h2>

        {/* Gelişmiş Arama Formu */}
        <form
          onSubmit={(e) => { e.preventDefault(); setCurrentPage(1); fetchFolders(); }}
          className="space-y-4 p-4 mb-4 border rounded-lg dark:border-gray-600 transition-colors duration-300"
        >
          <div className="relative">
            <input
              type="text"
              value={searchCriteria.general}
              onChange={(e) => setSearchCriteria({ ...searchCriteria, general: e.target.value })}
              placeholder="Tüm alanlarda ara..."
              className="w-full p-3 pl-10 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 dark:text-white rounded-lg transition-colors duration-300"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>

          <div className="flex justify-between items-center">
            <div className="space-x-3">
              <button
                type="button"
                onClick={() => setIsAdvanced(!isAdvanced)}
                className="text-sm text-blue-600 dark:text-blue-400 transition-colors duration-300"
              >
                {isAdvanced ? 'Basit Aramaya Geç' : 'Gelişmiş Arama'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchCriteria({
                    general: '',
                    category: 'Tümü',
                    departmentId: 'Tümü',
                    clinic: '',
                    fileCode: '',
                    subject: '',
                    specialInfo: '',
                    startYear: '',
                    endYear: '',
                    retentionCode: 'Tümü',
                    status: 'Tümü',
                  });
                  setCurrentPage(1);
                }}
                className="text-sm text-gray-600 dark:text-gray-300 hover:underline"
              >
                Temizle
              </button>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center transition-colors duration-300"
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <SearchIcon size={18} className="mr-2" />}
              Ara
            </button>
          </div>

          {isAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t dark:border-gray-700 transition-colors duration-300">
              <select
                value={searchCriteria.category}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, category: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 dark:text-white rounded-lg transition-colors duration-300"
              >
                <option value="Tümü">Kategori: Tümü</option>
                <option value={Category.Tibbi}>Tıbbi</option>
                <option value={Category.Idari}>İdari</option>
              </select>

              <select
                value={searchCriteria.departmentId}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, departmentId: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 dark:text-white rounded-lg transition-colors duration-300"
              >
                <option value="Tümü">Birim: Tümü</option>
                {departments.filter(d => searchCriteria.category === 'Tümü' || d.category === searchCriteria.category).map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={searchCriteria.status}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, status: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 dark:text-white rounded-lg transition-colors duration-300"
              >
                <option value="Tümü">Durum: Tümü</option>
                <option value={FolderStatus.Arsivde}>Arşivde</option>
                <option value={FolderStatus.Cikista}>Çıkışta</option>
                <option value={FolderStatus.Imha}>İmha</option>
              </select>

              <input
                type="text"
                value={searchCriteria.clinic}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, clinic: e.target.value })}
                placeholder="Klinik Adı"
                disabled={searchCriteria.category === Category.Idari}
                className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg disabled:opacity-50 transition-colors duration-300"
              />
              
              <input
                type="text"
                value={searchCriteria.fileCode}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, fileCode: e.target.value })}
                placeholder="Dosya Kodu"
                className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-300"
              />
              
              <input
                type="text"
                value={searchCriteria.subject}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, subject: e.target.value })}
                placeholder="Konu"
                className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-300"
              />

              <input
                type="text"
                value={searchCriteria.startYear}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, startYear: e.target.value })}
                placeholder="Başlangıç Yılı"
                className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-300"
              />
              
              <input
                type="text"
                value={searchCriteria.endYear}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, endYear: e.target.value })}
                placeholder="Bitiş Yılı"
                className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-300"
              />

              <select
                value={searchCriteria.retentionCode}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, retentionCode: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 dark:text-white rounded-lg transition-colors duration-300"
              >
                <option value="Tümü">Saklama Kodu: Tümü</option>
                {RETENTION_CODES.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
          )}
        </form>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-visible space-y-3 mb-4">
            {Array.isArray(folders) && folders.map((folder) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                statusColor={statusColor(folder.status) as 'green' | 'yellow' | 'red'}
                departmentName={getDepartmentName(folder.departmentId)}
                categoryColor={folder.category === Category.Tibbi ? 'green' : 'blue'}
                onEdit={() => onEditFolder(folder.id)}
                onCheckout={() => handleOpenCheckoutModal(folder)}
                onReturn={() => handleReturnFolder(folder.id)}
                onDelete={() => askDelete(folder)}
              />
            ))}
            {(!Array.isArray(folders) || folders.length === 0) && (
              <div className="text-center text-gray-500 py-10">Kayıt bulunamadı.</div>
            )}
          </div>
        )}
        
        {/* Pagination Controls - Her zaman göster */}
        <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t dark:border-gray-700">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1 || loading}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-slate-600 transition-colors"
            title="İlk Sayfa"
          >
            İlk
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-slate-600 transition-colors"
          >
            <ChevronLeft size={16} className="inline-block" />
          </button>
          
          <div className="flex items-center gap-2 px-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sayfa</span>
            <input
              type="number"
              min="1"
              max={totalPages || 1}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  setCurrentPage(page);
                }
              }}
              className="w-16 px-2 py-1 text-center text-sm border border-gray-300 rounded-md dark:bg-slate-700 dark:border-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">/ {totalPages || 1}</span>
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || loading}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-slate-600 transition-colors"
          >
            <ChevronRight size={16} className="inline-block" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || loading}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-slate-600 transition-colors"
            title="Son Sayfa"
          >
            Son
          </button>
          
          <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
            Toplam {totalItems} kayıt
          </span>
        </div>
      </div>
    </div>
  );
};

export default FolderList;