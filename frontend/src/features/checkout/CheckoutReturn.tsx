import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useArchive } from '@/context/ArchiveContext';
import { Checkout, CheckoutStatus, Folder, Category, CheckoutType } from '@/types';
import { Modal } from '@/components/Modal';
import { Badge } from '@/components/Badge';
import { Phone, Calendar, User, FileText, Loader2, Info, GitBranch, Pencil, RotateCcw } from 'lucide-react';
import { toast } from '@/lib/toast';
import * as api from '@/api';
import { CheckoutModal } from './components/CheckoutModal';
import { CheckoutWithFolder } from './types';
import { toDate, getCheckoutCardColor } from './utils';
import { useCheckoutSSE } from './hooks';

export const CheckoutReturn: React.FC = () => {
  const { getDepartmentName, returnCheckout, updateCheckout } = useArchive();
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState<CheckoutWithFolder | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [checkoutToEdit, setCheckoutToEdit] = useState<CheckoutWithFolder | null>(null);

  const [activeCheckouts, setActiveCheckouts] = useState<CheckoutWithFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCheckouts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getActiveCheckouts();
      const sortedData = data.sort((a, b) => toDate(a.plannedReturnDate).getTime() - toDate(b.plannedReturnDate).getTime())
      setActiveCheckouts(sortedData);
    } catch (error: any) {
      // Sadece gerçek hataları göster, boş veri durumunu değil
      if (error.message && !error.message.includes('Failed to fetch')) {
        toast.error(`Aktif çıkışlar alınamadı: ${error.message}`);
      }
      setActiveCheckouts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCheckouts();
  }, [fetchCheckouts]);
  
  // Use SSE hook for real-time updates
  useCheckoutSSE(fetchCheckouts);

  const handleReturnClick = (checkout: CheckoutWithFolder) => {
    setSelectedCheckout(checkout);
    setIsReturnModalOpen(true);
  };
  
  const handleEditClick = (checkout: CheckoutWithFolder) => {
    setCheckoutToEdit(checkout);
    setIsEditModalOpen(true);
  };

  const confirmReturn = () => {
    if (selectedCheckout) {
      returnCheckout(selectedCheckout.id);
      setActiveCheckouts(prev => prev.filter(c => c.id !== selectedCheckout.id));
    }
    setIsReturnModalOpen(false);
    setSelectedCheckout(null);
  };
  
  const handleConfirmEdit = (updatedData: Checkout) => {
    updateCheckout(updatedData);
    // Optimistically update local state
    setActiveCheckouts(prev => prev.map(c => c.id === updatedData.id ? { ...c, ...updatedData } : c));
    setIsEditModalOpen(false);
    setCheckoutToEdit(null);
  };

  return (
    <div className="p-5">
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="İade Onayı"
        onConfirm={confirmReturn}
        confirmText="İade Al"
        confirmColor="bg-status-green"
      >
        {selectedCheckout && (
          <p>
            <span className="font-bold">{selectedCheckout.folder.subject}</span> konulu
            klasörü iade almak istediğinizden emin misiniz?
          </p>
        )}
      </Modal>

      <CheckoutModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        checkoutToEdit={checkoutToEdit}
        onConfirm={(data: any) => handleConfirmEdit(data)}
      />

      <div className="bg-white dark:bg-archive-dark-panel p-4 rounded-xl shadow-lg transition-colors duration-300">
        <h2 className="text-base font-bold mb-3 text-gray-900 dark:text-white transition-colors duration-300">
          Çıkış/İade Takip
        </h2>
        <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white transition-colors duration-300">
          Aktif Çıkışlar ({activeCheckouts.length})
        </h3>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {activeCheckouts.map((checkout) => {
              const folder = checkout.folder;
              if (!folder) return null;

              return (
                <div
                  key={checkout.id}
                  className={`p-4 rounded-lg shadow-sm border dark:border-gray-700 ${getCheckoutCardColor(
                    checkout
                  )} transition-all duration-300 hover:shadow-md`}
                >
                  <div className="flex gap-6">
                    {/* Sol: Klasör Bilgileri */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          text={folder.category}
                          color={folder.category === Category.Tibbi ? 'green' : 'blue'}
                        />
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                          {getDepartmentName(folder.departmentId)} - {folder.subject}
                        </h4>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <div className="flex flex-wrap gap-x-4">
                          <span><strong>Dosya Kodu:</strong> {folder.fileCode}</span>
                          <span><strong>Dosya Yılı:</strong> {folder.fileYear}</span>
                          <span><strong>Dosya Sayısı:</strong> {folder.fileCount}</span>
                          <span><strong>Saklama:</strong> {folder.retentionPeriod}-{folder.retentionCode}</span>
                          {folder.clinic && <span><strong>Klinik:</strong> {folder.clinic}</span>}
                        </div>
                        {folder.specialInfo && (
                          <div><strong>Özel Bilgi:</strong> {folder.specialInfo}</div>
                        )}
                        <div>
                          <strong>Lokasyon:</strong>{' '}
                          {folder.location.storageType === 'Kompakt'
                            ? `Ünite ${folder.location.unit} - ${folder.location.face} Yüzü - ${folder.location.section}.Bölüm - ${folder.location.shelf}.Raf`
                            : `Stand ${folder.location.stand} - ${folder.location.shelf}.Raf`}
                        </div>
                      </div>
                    </div>

                    {/* Sağ: Çıkış Bilgileri - Dikey Liste */}
                    <div className="flex-shrink-0 w-64">
                      <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="text-gray-500 dark:text-gray-400">Alan Kişi:</span>
                          <span className="font-medium">{checkout.personName} {checkout.personSurname}</span>
                        </div>
                        {checkout.personPhone && (
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-gray-400 flex-shrink-0" />
                            <span className="text-gray-500 dark:text-gray-400">Telefon:</span>
                            <span>{checkout.personPhone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="text-gray-500 dark:text-gray-400">Çıkış:</span>
                          <span>{toDate(checkout.checkoutDate).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-orange-400 flex-shrink-0" />
                          <span className="text-gray-500 dark:text-gray-400">İade Plan:</span>
                          <span>{toDate(checkout.plannedReturnDate).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <GitBranch size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="text-gray-500 dark:text-gray-400">Çıkış Tipi:</span>
                          <Badge text={checkout.checkoutType} color={checkout.checkoutType === CheckoutType.Tam ? 'blue' : 'orange'} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Info size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="text-gray-500 dark:text-gray-400">Çıkış Nedeni:</span>
                          <span className="truncate" title={checkout.reason || 'Belirtilmemiş'}>
                            {checkout.reason || <span className="italic text-gray-400">-</span>}
                          </span>
                        </div>
                        {checkout.checkoutType === CheckoutType.Kismi && checkout.documentDescription && (
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-gray-400 flex-shrink-0" />
                            <span className="text-gray-500 dark:text-gray-400">Evrak:</span>
                            <span className="truncate" title={checkout.documentDescription}>
                              {checkout.documentDescription}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Butonlar */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleReturnClick(checkout)}
                          className="flex-1 py-2 px-3 text-white bg-status-green rounded-md hover:bg-green-600 transition-colors text-sm font-medium"
                        >
                          İade Al
                        </button>
                        <button
                          title="Düzenle"
                          onClick={() => handleEditClick(checkout)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {activeCheckouts.length === 0 && !isLoading && (
              <div className="text-center text-gray-500 py-10">Aktif çıkış bulunmuyor.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
