import React, { useState, FormEvent, useCallback, useEffect } from 'react';
import { useArchive } from '@/context/ArchiveContext';
import { Badge } from '@/components/Badge';
import {
  Category,
  Folder,
  FolderStatus,
  Checkout,
  FolderActionProps,
  CheckoutStatus,
} from '@/types';
import { FileText, Edit, FileOutput, RotateCcw, Search as SearchIcon, Loader2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { RETENTION_CODES } from '@/constants';
import { CheckoutModal } from '@/components/CheckoutModal';
import { Modal } from '@/components/Modal';
import { toast } from '@/lib/toast';

const API_BASE = (process.env as any).API_BASE;
const api = (p: string) => `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;

const initialFormState = {
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
};

const itemsPerPage = 20;

// FIX: Changed interface to a type intersection to resolve property not existing error.
type SearchProps = FolderActionProps & {
  initialCriteria: {
    category?: Category;
  } | null;
};

export const Search: React.FC<SearchProps> = ({ onEditFolder, initialCriteria }) => {
  const {
    folders: searchResults,
    setFolders,
    getDepartmentName,
    departments,
    addCheckout,
    getCheckoutsForFolder,
    returnCheckout,
    deleteFolder,
  } = useArchive();

  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [criteria, setCriteria] = useState(initialFormState);

  const [isCheckoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedFolderForCheckout, setSelectedFolderForCheckout] = useState<Folder | null>(null);
  
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedFolderToDelete, setSelectedFolderToDelete] = useState<Folder | null>(null);

  const fetchResults = useCallback(async (page: number, searchCriteria: typeof initialFormState) => {
    setIsLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      limit: String(itemsPerPage),
    });

    Object.entries(searchCriteria).forEach(([key, value]) => {
      if (value && value !== 'Tümü') {
        params.append(key, String(value));
      }
    });

    try {
      const res = await fetch(api(`/folders?${params.toString()}`));
      if (!res.ok) throw new Error('Arama başarısız oldu');
      const data = await res.json();
      setFolders(data.items);
      setTotalItems(data.total);
      if (data.total === 0 && hasSearched) { // Sadece aktif bir aramadan sonra göster
        toast.info('Kriterlere uygun klasör bulunamadı.');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [setFolders, hasSearched]);
  
  // Dashboard'dan yönlendirme ile geldiğinde aramayı tetikle
  useEffect(() => {
    if (initialCriteria) {
      const newCriteria = { ...initialFormState, ...initialCriteria };
      setCriteria(newCriteria);
      setHasSearched(true);
      fetchResults(1, newCriteria);
    }
  }, [initialCriteria, fetchResults]);

  // Sayfa değiştiğinde aramayı yenile
  useEffect(() => {
    if (hasSearched) {
      fetchResults(currentPage, criteria);
    }
  }, [currentPage]);
  
  // Sayfadan ayrılırken sonuçları temizle
  useEffect(() => {
    return () => {
      setFolders([]);
    }
  }, [setFolders]);


  const getStatusBadgeColor = (status: FolderStatus) => {
    switch (status) {
      case FolderStatus.Arsivde: return 'green';
      case FolderStatus.Cikista: return 'yellow';
      case FolderStatus.Imha: return 'red';
      default: return 'gray';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCriteria(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (criteria.startYear && criteria.endYear && Number(criteria.startYear) > Number(criteria.endYear)) {
      toast.warning('Başlangıç yılı, bitiş yılından büyük olamaz.');
      return;
    }
    setHasSearched(true);
    if (currentPage === 1) {
      fetchResults(1, criteria);
    } else {
      setCurrentPage(1); // Sayfayı sıfırla, bu da useEffect'i tetikleyerek arama yapar
    }
  };
  
  const handleOpenCheckoutModal = (folder: Folder) => {
    setSelectedFolderForCheckout(folder);
    setCheckoutModalOpen(true);
  };

  const handleCloseCheckoutModal = () => {
    setCheckoutModalOpen(false);
    setSelectedFolderForCheckout(null);
  };

  const handleConfirmCheckout = (checkoutData: Omit<Checkout, 'id' | 'status' | 'checkoutDate'>) => {
    addCheckout(checkoutData);
    handleCloseCheckoutModal();
    toast.success('Çıkış verildi.');
  };

  const handleReturnFolder = (folderId: number) => {
    const activeCheckout = getCheckoutsForFolder(folderId).find(
      c => c.status === CheckoutStatus.Cikista
    );
    if (activeCheckout) {
      returnCheckout(activeCheckout.id);
      toast.success('İade alındı.');
    } else {
      toast.info('Bu klasör için aktif bir çıkış bulunamadı.');
    }
  };

  const askDelete = (folder: Folder) => {
    setSelectedFolderToDelete(folder);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedFolderToDelete) {
      await deleteFolder(selectedFolderToDelete.id);
      if (searchResults.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchResults(currentPage, criteria);
      }
    }
    setDeleteModalOpen(false);
    setSelectedFolderToDelete(null);
  };

  const filteredDepartments = departments.filter(
    d => criteria.category === 'Tümü' || d.category === criteria.category
  );

  const resetCriteria = () => {
    setCriteria(initialFormState);
    setHasSearched(false);
    setFolders([]);
    setTotalItems(0);
    setCurrentPage(1);
  };

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
        <h2 className="text-2xl font-bold mb-4 transition-colors duration-300">Arama</h2>

        <form
          onSubmit={handleSearch}
          className="space-y-4 p-4 border rounded-lg dark:border-gray-600 transition-colors duration-300"
        >
          <div className="relative">
            <input
              type="text"
              name="general"
              value={criteria.general}
              onChange={handleChange}
              placeholder="Tüm alanlarda ara..."
              className="w-full p-3 pl-10 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-300"
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
                onClick={resetCriteria}
                className="text-sm text-gray-600 dark:text-gray-300 hover:underline"
              >
                Temizle
              </button>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center transition-colors duration-300"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <SearchIcon size={18} className="mr-2" />}
              Ara
            </button>
          </div>

          {isAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t dark:border-gray-700 transition-colors duration-300">
              <select
                name="category"
                value={criteria.category}
                onChange={handleChange}
                className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-300"
              >
                <option value="Tümü">Kategori: Tümü</option>
                <option value={Category.Tibbi}>Tıbbi</option>
                <option value={Category.Idari}>İdari</option>
              </select>

              <select
                name="departmentId"
                value={criteria.departmentId}
                onChange={handleChange}
                className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-300"
              >
                <option value="Tümü">Birim: Tümü</option>
                {filteredDepartments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                name="clinic"
                value={criteria.clinic}
                onChange={handleChange}
                placeholder="Klinik Adı"
                disabled={criteria.category === Category.Idari}
                className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg disabled:opacity-50 transition-colors duration-300"
              />
              <input
                type="text"
                name="fileCode"
                value={criteria.fileCode}
                onChange={handleChange}
                placeholder="Dosya Kodu"
                className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-300"
              />
              <input
                type="text"
                name="subject"
                value={criteria.subject}
                onChange={handleChange}
                placeholder="Konu Adı"
                className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-300"
              />
              <input
                type="text"
                name="specialInfo"
                value={criteria.specialInfo}
                onChange={handleChange}
                placeholder="Özel Bilgi"
                className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-300"
              />

              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  name="startYear"
                  value={criteria.startYear}
                  onChange={handleChange}
                  placeholder="Başlangıç Yılı"
                  className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-300"
                />
                <span>-</span>
                <input
                  type="number"
                  name="endYear"
                  value={criteria.endYear}
                  onChange={handleChange}
                  placeholder="Bitiş Yılı"
                  className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-300"
                />
              </div>

              <select
                name="retentionCode"
                value={criteria.retentionCode}
                onChange={handleChange}
                className="w-full p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-300"
              >
                <option value="Tümü">Saklama Kodu: Tümü</option>
                {RETENTION_CODES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </form>

        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4 transition-colors duration-300">
            Arama Sonuçları ({totalItems})
          </h3>
            
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {!hasSearched ? (
                <div className="text-center py-10 text-gray-500">
                  <SearchIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium">Arama Yapın</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Sonuçları görmek için yukarıdaki arama alanlarını kullanın.
                  </p>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(folder => (
                  <div
                    key={folder.id}
                    className="p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge
                            text={folder.category}
                            color={folder.category === Category.Tibbi ? 'green' : 'blue'}
                          />
                          <h4 className="font-bold text-lg text-gray-900 dark:text-white transition-colors duration-300">
                            {getDepartmentName(folder.departmentId)} - {folder.subject}
                          </h4>
                        </div>

                        <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1 transition-colors duration-300">
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

                        <div className="text-sm mt-1 text-gray-900 dark:text-white transition-colors duration-300">
                          <strong>Lokasyon:</strong>{' '}
                          {folder.location.storageType === 'Kompakt'
                            ? `Ünite ${folder.location.unit} - ${folder.location.face} - ${folder.location.section}.Bölüm - ${folder.location.shelf}.Raf`
                            : `Stand ${folder.location.stand} - ${folder.location.shelf}.Raf`}
                        </div>

                        <div className="mt-2">
                          <strong className="text-gray-900 dark:text-white transition-colors duration-300">
                            Durum:{' '}
                          </strong>
                          <Badge text={folder.status} color={getStatusBadgeColor(folder.status)} />
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-2">
                        <div className="flex space-x-2">
                          {folder.pdfPath && (
                            <button
                              title="PDF Görüntüle"
                              onClick={() => window.open(`/api/serve-pdf/${folder.pdfPath}`, '_blank')}
                              className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 transition-colors duration-300"
                            >
                              <FileText size={16} />
                            </button>
                          )}

                          <button
                            title="Düzenle"
                            onClick={() => onEditFolder(folder.id)}
                            className="p-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900 transition-colors duration-300"
                          >
                            <Edit size={16} />
                          </button>

                          {folder.status === FolderStatus.Arsivde && (
                            <button
                              title="Çıkış Ver"
                              onClick={() => handleOpenCheckoutModal(folder)}
                              className="p-2 bg-orange-100 text-orange-600 rounded-md hover:bg-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:hover:bg-orange-900 transition-colors duration-300"
                            >
                              <FileOutput size={16} />
                            </button>
                          )}

                          {folder.status === FolderStatus.Cikista && (
                            <button
                              title="İade Al"
                              onClick={() => handleReturnFolder(folder.id)}
                              className="p-2 bg-green-100 text-green-600 rounded-md hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900 transition-colors duration-300"
                            >
                              <RotateCcw size={16} />
                            </button>
                          )}

                          <button
                            title="Sil"
                            onClick={() => askDelete(folder)}
                            className="p-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : hasSearched && (
                <div className="text-center py-10 text-gray-500">
                  <h3 className="text-sm font-medium">Sonuç Bulunamadı</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Arama kriterlerinize uygun sonuç bulunamadı.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {totalItems > itemsPerPage && (
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
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
                disabled={currentPage === totalPages || isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-slate-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-slate-600"
              >
                Sonraki
                <ChevronRight size={16} className="inline-block ml-1" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};