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
    <div className="p-3 xl:p-5">
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

      <div className="bg-white dark:bg-archive-dark-panel p-3 xl:p-4 rounded-xl shadow-lg transition-colors duration-300">
        <h2 className="text-sm font-bold mb-3 text-gray-900 dark:text-white transition-colors duration-300">
          Dosya Talep
        </h2>
        <h3 className="text-xs xl:text-sm font-semibold mb-3 text-gray-900 dark:text-white transition-colors duration-300">
          Aktif Talep ({activeCheckouts.length})
        </h3>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
          </div>
        ) : (
          <div className="space-y-3 xl:space-y-4">
            {activeCheckouts.map((checkout) => {
              const folder = checkout.folder;
              if (!folder) return null;

              return (
                <div
                  key={checkout.id}
                  className={`p-3 xl:p-4 rounded-lg shadow-sm border dark:border-gray-700 ${getCheckoutCardColor(
                    checkout
                  )} transition-all duration-300 hover:shadow-md`}
                >
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Sol: Klasör Bilgileri */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          text={folder.category}
                          color={folder.category === Category.Tibbi ? 'green' : 'blue'}
                        />
                        <h4 className="font-semibold text-xs xl:text-sm text-gray-900 dark:text-white">
                          {getDepartmentName(folder.departmentId)} - {folder.subject}
                        </h4>
                      </div>
                      <div className="text-[11px] xl:text-xs text-gray-500 dark:text-gray-400 space-y-1">
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

                    {/* Sağ: Çıkış Bilgileri - İki Sütun */}
                    <div className="flex-shrink-0 w-full lg:w-72 xl:w-80">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] xl:text-xs text-gray-600 dark:text-gray-300">
                        {/* Sol Sütun */}
                        <div className="space-y-2">
                          <div className="flex items-start gap-1.5">
                            <User size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-500 dark:text-gray-400 text-[10px] xl:text-[11px] leading-tight">Alan Kişi:</div>
                              <div className="font-medium text-gray-700 dark:text-gray-200 text-[11px] xl:text-xs">{checkout.personName} {checkout.personSurname}</div>
                            </div>
                          </div>
                          {checkout.personPhone && (
                            <div className="flex items-start gap-1.5">
                              <Phone size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="text-gray-500 dark:text-gray-400 text-[10px] xl:text-[11px] leading-tight">Telefon:</div>
                                <div className="text-gray-700 dark:text-gray-200 text-[11px] xl:text-xs">{checkout.personPhone}</div>
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-1.5">
                            <Calendar size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-500 dark:text-gray-400 text-[10px] xl:text-[11px] leading-tight">Çıkış:</div>
                              <div className="text-gray-700 dark:text-gray-200 text-[11px] xl:text-xs">{toDate(checkout.checkoutDate).toLocaleDateString('tr-TR')}</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <Calendar size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-500 dark:text-gray-400 text-[10px] xl:text-[11px] leading-tight">İade Plan:</div>
                              <div className="text-gray-700 dark:text-gray-200 text-[11px] xl:text-xs">{toDate(checkout.plannedReturnDate).toLocaleDateString('tr-TR')}</div>
                            </div>
                          </div>
                        </div>

                        {/* Sağ Sütun */}
                        <div className="space-y-2">
                          <div className="flex items-start gap-1.5">
                            <GitBranch size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-500 dark:text-gray-400 text-[10px] xl:text-[11px] leading-tight">Çıkış Tipi:</div>
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] xl:text-[11px] font-medium ${
                                checkout.checkoutType === CheckoutType.Tam 
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                              }`}>
                                {checkout.checkoutType}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <Info size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-500 dark:text-gray-400 text-[10px] xl:text-[11px] leading-tight">Çıkış Nedeni:</div>
                              <div className="text-gray-700 dark:text-gray-200 text-[11px] xl:text-xs break-words" title={checkout.reason || 'Belirtilmemiş'}>
                                {checkout.reason || <span className="italic text-gray-400">-</span>}
                              </div>
                            </div>
                          </div>
                          {checkout.checkoutType === CheckoutType.Kismi && checkout.documentDescription && (
                            <div className="flex items-start gap-1.5">
                              <FileText size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="text-gray-500 dark:text-gray-400 text-[10px] xl:text-[11px] leading-tight">Evrak:</div>
                                <div className="text-gray-700 dark:text-gray-200 text-[11px] xl:text-xs break-words" title={checkout.documentDescription}>
                                  {checkout.documentDescription}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Butonlar */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleReturnClick(checkout)}
                          className="flex-1 py-1.5 px-3 text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors text-xs xl:text-sm font-medium"
                        >
                          İade Al
                        </button>
                        <button
                          title="Düzenle"
                          onClick={() => handleEditClick(checkout)}
                          className="p-1.5 xl:p-2 bg-teal-100 text-teal-700 rounded-md hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-300 dark:hover:bg-teal-900 transition-colors"
                        >
                          <Pencil size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {activeCheckouts.length === 0 && !isLoading && (
              <div className="text-center text-gray-500 py-10">Aktif talep bulunmuyor.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
