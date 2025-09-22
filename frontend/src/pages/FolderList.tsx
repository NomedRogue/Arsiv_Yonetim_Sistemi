import React, { useMemo, useState, useEffect, useCallback, memo } from 'react';
import { useArchive } from '@/context/ArchiveContext';
import { Category, Folder, FolderStatus, Checkout, CheckoutStatus } from '@/types';
import { FileText, Edit, FileOutput, RotateCcw, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { CheckoutModal } from '@/components/CheckoutModal';
import { Modal } from '@/components/Modal';
import { toast } from '@/lib/toast';

// Vite proxy kullan - /api otomatik olarak http://localhost:3001'e yönlendirilecek  
const api = (p: string) => `/api${p.startsWith('/') ? '' : '/'}${p}`;

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
    <div className="p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.01]">
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
              onClick={() => window.open(`/api/serve-pdf/${folder.pdfPath}`, '_blank')}
              className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 transition-colors"
            >
              <FileText size={16} />
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
    folders,
    loading,
    getDepartmentName,
    addCheckout,
    getCheckoutsForFolder,
    returnCheckout,
    deleteFolder,
    refresh, // Context'ten gelen folders'ı yenilemek için
  } = useArchive();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [isCheckoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedFolderForCheckout, setSelectedFolderForCheckout] = useState<Folder | null>(null);

  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedFolderToDelete, setSelectedFolderToDelete] = useState<Folder | null>(null);

  // Context'teki folders'ı kullan, paginate et
  const paginatedFolders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return (folders || []).slice(startIndex, endIndex);
  }, [folders, currentPage, itemsPerPage]);

  const totalItems = (folders || []).length;

  // Optimized memoized callbacks
  const handleOpenCheckoutModal = useCallback((folder: Folder) => {
    setSelectedFolderForCheckout(folder);
    setCheckoutModalOpen(true);
  }, []);

  const handleCloseCheckoutModal = useCallback(() => {
    setSelectedFolderForCheckout(null);
    setCheckoutModalOpen(false);
  }, []);

  const handleConfirmCheckout = useCallback((data: Omit<Checkout, 'id' | 'status' | 'checkoutDate'>) => {
    addCheckout(data);
    handleCloseCheckoutModal();
  }, [addCheckout, handleCloseCheckoutModal]);

  const handleReturnFolder = useCallback((folderId: number) => {
    const active = getCheckoutsForFolder(folderId).find(
      (c) => c.status === CheckoutStatus.Cikista
    );
    if (active) {
      returnCheckout(active.id);
    } else {
      toast.info('Bu klasör için aktif bir çıkış bulunamadı.');
    }
  }, [getCheckoutsForFolder, returnCheckout]);

  const askDelete = useCallback((folder: Folder) => {
    setSelectedFolderToDelete(folder);
    setDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (selectedFolderToDelete) {
      await deleteFolder(selectedFolderToDelete.id);
      // Context'teki refresh ile verileri yenile
      await refresh();
      // İlk sayfaya dön
      if ((folders?.length || 0) === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
    setDeleteModalOpen(false);
    setSelectedFolderToDelete(null);
  }, [selectedFolderToDelete, deleteFolder, folders?.length, currentPage, setCurrentPage, refresh]);

  const statusColor = (st: FolderStatus) =>
    st === FolderStatus.Arsivde ? 'green' : st === FolderStatus.Cikista ? 'yellow' : 'red';

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="p-6">
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

      <div className="bg-white dark:bg-archive-dark-panel p-6 rounded-xl shadow-lg transition-colors duration-300">
        <h2 className="text-2xl font-bold mb-4">Tüm Klasörler ({totalItems})</h2>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedFolders.map((folder) => (
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
            {(folders?.length || 0) === 0 && (
              <div className="text-center text-gray-500 py-10">Kayıt bulunamadı.</div>
            )}
          </div>
        )}
        
        {/* Pagination Controls */}
        {totalItems > itemsPerPage && (
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-slate-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-slate-600"
            >
              <ChevronLeft size={16} className="inline-block mr-1" />
              Önceki
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-400">
              Sayfa {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-slate-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-slate-600"
            >
              Sonraki
              <ChevronRight size={16} className="inline-block ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderList;