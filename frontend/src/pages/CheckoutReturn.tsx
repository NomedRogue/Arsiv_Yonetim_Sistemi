import React, { useMemo, useState, useEffect } from 'react';
import { useArchive } from '@/context/ArchiveContext';
import { Checkout, CheckoutStatus, Folder, Category, CheckoutType } from '@/types';
import { Modal } from '@/components/Modal';
import { Badge } from '@/components/Badge';
import { Phone, Calendar, User, FileText, Loader2, Info, GitBranch, Pencil } from 'lucide-react';
import { toast } from '@/lib/toast';
import * as api from '@/api';
import { CheckoutModal } from '@/components/CheckoutModal';

const toDate = (d: unknown): Date => (d instanceof Date ? d : new Date(d as any));

type CheckoutWithFolder = Checkout & { folder: Folder };

export const CheckoutReturn: React.FC = () => {
  const { getDepartmentName, returnCheckout, updateCheckout } = useArchive();
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState<CheckoutWithFolder | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [checkoutToEdit, setCheckoutToEdit] = useState<CheckoutWithFolder | null>(null);

  const [activeCheckouts, setActiveCheckouts] = useState<CheckoutWithFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCheckouts = async () => {
      setIsLoading(true);
      try {
        const data = await api.getActiveCheckouts();
        const sortedData = data.sort((a, b) => toDate(a.plannedReturnDate).getTime() - toDate(b.plannedReturnDate).getTime())
        setActiveCheckouts(sortedData);
      } catch (error: any) {
        toast.error(`Aktif çıkışlar alınamadı: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCheckouts();
  }, []);

  const getCardColor = (checkout: Checkout) => {
    const plannedReturn = toDate(checkout.plannedReturnDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = (plannedReturn.getTime() - now.getTime()) / (1000 * 3600 * 24);

    if (diffDays < 0) return 'border-l-4 border-status-red bg-red-50 dark:bg-red-900/20';
    if (diffDays <= 3) return 'border-l-4 border-status-yellow bg-yellow-50 dark:bg-yellow-900/20';
    return 'border-l-4 border-transparent bg-white dark:bg-archive-dark-panel';
  };

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
    <div className="p-6">
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

      <div className="bg-white dark:bg-archive-dark-panel p-6 rounded-xl shadow-lg transition-colors duration-300">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white transition-colors duration-300">
          Çıkış/İade Takip
        </h2>
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white transition-colors duration-300">
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
                  className={`p-4 rounded-lg shadow-sm border dark:border-gray-700 ${getCardColor(
                    checkout
                  )} transition-all duration-300 hover:shadow-lg hover:scale-[1.01]`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Folder Info */}
                    <div className="md:col-span-2">
                      <div className="flex items-center space-x-2 mb-2">
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
                      <div className="text-sm mt-1 text-gray-600 dark:text-gray-400 transition-colors duration-300">
                        <strong>Lokasyon:</strong>{' '}
                        {folder.location.storageType === 'Kompakt'
                          ? `Ünite ${folder.location.unit} - ${folder.location.face} - ${folder.location.section}.Bölüm - ${folder.location.shelf}.Raf`
                          : `Stand ${folder.location.stand} - ${folder.location.shelf}.Raf`}
                      </div>
                    </div>

                    {/* Checkout Info & Actions */}
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-800 dark:text-gray-200 transition-colors duration-300">
                        <User size={16} className="mr-2 text-gray-500" />
                        <strong>Alan Kişi:</strong>
                        <span className="ml-2">
                          {checkout.personName} {checkout.personSurname}
                        </span>
                      </div>
                      {checkout.personPhone && (
                        <div className="flex items-center text-sm text-gray-800 dark:text-gray-200 transition-colors duration-300">
                          <Phone size={16} className="mr-2 text-gray-500" />
                          <strong>Telefon:</strong>
                          <span className="ml-2">{checkout.personPhone}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-800 dark:text-gray-200 transition-colors duration-300">
                        <Calendar size={16} className="mr-2 text-gray-500" />
                        <div>
                          <p>
                            <strong>Çıkış:</strong> {toDate(checkout.checkoutDate).toLocaleDateString()}
                          </p>
                          <p>
                            <strong>İade Plan:</strong> {toDate(checkout.plannedReturnDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                       <div className="pt-2 border-t dark:border-slate-700/50 space-y-2 text-sm">
                        <div className="flex items-center text-gray-800 dark:text-gray-200 transition-colors duration-300">
                            <GitBranch size={16} className="mr-2 text-gray-500" />
                            <strong>Çıkış Tipi:</strong>
                            <span className="ml-2"><Badge text={checkout.checkoutType} color={checkout.checkoutType === CheckoutType.Tam ? 'blue' : 'orange'} /></span>
                        </div>
                       {checkout.reason && (
                        <div className="flex items-start text-gray-800 dark:text-gray-200 transition-colors duration-300">
                          <Info size={16} className="mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                          <strong className="flex-shrink-0">Çıkış Nedeni:</strong>
                          <span className="ml-2">{checkout.reason}</span>
                        </div>
                      )}
                      {checkout.checkoutType === CheckoutType.Kismi && checkout.documentDescription && (
                        <div className="flex items-start text-gray-800 dark:text-gray-200 transition-colors duration-300">
                          <FileText size={16} className="mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                          <strong className="flex-shrink-0">Çıkan Belge:</strong>
                          <p className="ml-2 break-all">{checkout.documentDescription}</p>
                        </div>
                      )}
                      </div>
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleReturnClick(checkout)}
                          className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-status-green rounded-md hover:bg-green-600 transition-colors duration-300"
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