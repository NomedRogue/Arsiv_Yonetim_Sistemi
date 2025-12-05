import React, { useMemo, useState, useEffect } from 'react';
import { useArchive } from '@/context/ArchiveContext';
import { Modal } from '@/components/Modal';
import { Badge } from '@/components/Badge';
import * as api from '@/api';
import { toast } from '@/lib/toast';
import { Loader2 } from 'lucide-react';
import { Category, Folder, FolderStatus } from './types';
import type { DisposalViewType, DisposalTabType } from './types';
import { getDisposalStatus, getStatusBadgeColor } from './utils';
import { useDisposalSSE } from './hooks';

const DisposableFoldersView: React.FC<{ initialFilter?: DisposalViewType }> = ({ initialFilter }) => {
    const { getDepartmentName } = useArchive();
    const [selectedView, setSelectedView] = useState<DisposalViewType>(initialFilter || 'thisYear');
    const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [disposableFolders, setDisposableFolders] = useState<Folder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const fetchFolders = async () => {
        setIsLoading(true);
        try {
            const data = await api.getDisposableFolders(selectedView);
            setDisposableFolders(data);
        } catch (error: any) {
            // Sadece gerçek hataları göster, boş veri durumunu değil
            if (error.message && !error.message.includes('Failed to fetch')) {
                toast.error(`İmha edilecek klasörler alınamadı: ${error.message}`);
            }
            setDisposableFolders([]);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchFolders();
    }, [selectedView]);

    // Use SSE hook for real-time updates
    useDisposalSSE(fetchFolders);

    const handleSelectFolder = (id: number) => {
        setSelectedFolderIds(prev =>
            prev.includes(id) ? prev.filter(folderId => folderId !== id) : [...prev, id]
        );
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedFolderIds(disposableFolders.map(f => f.id));
        } else {
            setSelectedFolderIds([]);
        }
    };

    const handleConfirmDisposal = async () => {
        try {
            // Seçili klasörleri bul
            const foldersToDispose = disposableFolders.filter(f => selectedFolderIds.includes(f.id));
            
            // Çıkışta olanları kontrol et
            if (foldersToDispose.some(f => f.status === FolderStatus.Cikista)) {
                toast.error('Çıkışta olan klasörler imha edilemez.');
                return;
            }
            
            // Tüm klasörleri "İmha" durumuna güncelle ve disposal kayıtları oluştur
            const now = new Date();
            const updates = foldersToDispose.map(async (f, i) => {
                // Klasör durumunu güncelle
                await api.updateFolder({ ...f, status: FolderStatus.Imha, updatedAt: now });
                
                // Disposal kaydı oluştur
                await api.createDisposal({
                    id: `disposal_${Date.now()}_${i}`,
                    folderId: f.id,
                    disposalDate: now.toISOString(),
                    originalFolderData: f
                });
            });
            
            await Promise.all(updates);
            
            toast.success(`${selectedFolderIds.length} klasör imha edildi.`);
            
            // Local state'i güncelle
            setDisposableFolders(prev => prev.filter(f => !selectedFolderIds.includes(f.id)));
            setSelectedFolderIds([]);
            setIsModalOpen(false);
            
            // Liste yenilenecek (SSE ile otomatik)
        } catch (e: any) {
            toast.error(`İmha işlemi başarısız: ${e.message}`);
        }
    };

    return (
        <>
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Klasör İmha İşlemi"
                onConfirm={handleConfirmDisposal}
                confirmText="Onayla ve İmha Et"
                type="danger"
                showIcon={true}
            >
                <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-red-100 dark:bg-red-900/40 rounded-full">
                            <span className="text-xl font-bold text-red-600 dark:text-red-400">{selectedFolderIds.length}</span>
                        </div>
                        <div>
                            <p className="font-semibold text-sm text-red-700 dark:text-red-300">Klasör Seçildi</p>
                            <p className="text-xs text-red-600 dark:text-red-400">Kalıcı olarak silinecek</p>
                        </div>
                    </div>
                    
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                        <p className="mb-1.5">Bu işlem sonucunda:</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                            <li>Seçili klasörler sistemden kaldırılacak</li>
                            <li>İlgili PDF ve Excel dosyaları silinecek</li>
                            <li>İmha kaydı oluşturulacak</li>
                        </ul>
                    </div>
                    
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                            ⚠️ Bu işlem geri alınamaz!
                        </p>
                    </div>
                </div>
            </Modal>
            <div className="flex space-x-2 border-b dark:border-gray-600 mb-4 transition-colors duration-300">
                <button onClick={() => setSelectedView('thisYear')} className={`px-4 py-2 text-sm font-medium transition-colors duration-300 ${selectedView === 'thisYear' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 dark:text-gray-400'}`}>Bu Yıl İmha Edilecekler</button>
                <button onClick={() => setSelectedView('nextYear')} className={`px-4 py-2 text-sm font-medium transition-colors duration-300 ${selectedView === 'nextYear' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 dark:text-gray-400'}`}>Gelecek Yıl İmha Edilecekler</button>
                <button onClick={() => setSelectedView('overdue')} className={`px-4 py-2 text-sm font-medium transition-colors duration-300 ${selectedView === 'overdue' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 dark:text-gray-400'}`}>İmha Süresi Geçenler</button>
            </div>
            <div className="flex justify-between items-center mb-4">
                 <p className="text-sm text-gray-700 dark:text-gray-400 transition-colors duration-300">{disposableFolders.length} klasör bulundu.</p>
                 {selectedFolderIds.length > 0 && (
                     <button 
                         onClick={() => setIsModalOpen(true)}
                         className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors duration-300">
                         {selectedFolderIds.length} Klasörü İmha Et
                     </button>
                 )}
            </div>
            {isLoading ? (
                 <div className="flex justify-center items-center py-10">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                 </div>
            ) : (
                <div className="overflow-hidden p-2">
                    {disposableFolders.length > 0 && (
                        <div className="px-4 py-3 bg-gray-100 dark:bg-slate-700 border dark:border-gray-600 rounded-lg flex items-center mb-4">
                            <input 
                                type="checkbox" 
                                onChange={handleSelectAll} 
                                checked={selectedFolderIds.length === disposableFolders.length}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-3 text-xs font-semibold text-gray-700 uppercase dark:text-gray-400">
                                Tümünü Seç ({selectedFolderIds.length} / {disposableFolders.length})
                            </span>
                        </div>
                    )}
                    <div className="space-y-3">
                        {disposableFolders.map(folder => {
                            const disposalStatus = getDisposalStatus(folder);
                            return (
                                <div
                                    key={folder.id}
                                    className="p-3 border rounded-lg dark:border-gray-600 bg-white dark:bg-archive-dark-panel transition-all duration-300 hover:shadow-md cursor-pointer flex items-start gap-3"
                                    onClick={() => handleSelectFolder(folder.id)}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={selectedFolderIds.includes(folder.id)} 
                                        readOnly
                                        className="mt-0.5 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                                    />
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge text={folder.category} color={folder.category === Category.Tibbi ? 'green' : 'blue'} />
                                            <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{getDepartmentName(folder.departmentId)} - {folder.subject}</h4>
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4">
                                            <span><strong>Dosya Kodu:</strong> {folder.fileCode}</span>
                                            <span><strong>Dosya Yılı:</strong> {folder.fileYear}</span>
                                            <span><strong>Dosya Sayısı:</strong> {folder.fileCount}</span>
                                            <span><strong>Saklama:</strong> {folder.retentionPeriod}-{folder.retentionCode}</span>
                                            {folder.clinic && <span><strong>Klinik:</strong> {folder.clinic}</span>}
                                            {folder.specialInfo && <span><strong>Özel Bilgi:</strong> {folder.specialInfo}</span>}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            <strong>Lokasyon:</strong>{' '}
                                            {folder.location.storageType === 'Kompakt' 
                                                ? `Ünite ${folder.location.unit} - ${folder.location.face} - ${folder.location.section}.Bölüm - ${folder.location.shelf}.Raf`
                                                : `Stand ${folder.location.stand} - ${folder.location.shelf}.Raf`}
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-3 text-xs">
                                            <span className="flex items-center gap-1"><strong>Durum:</strong> <Badge text={folder.status} color={getStatusBadgeColor(folder.status)} /></span>
                                            <span className="flex items-center gap-1"><strong>İmhaya:</strong> <Badge text={disposalStatus.text} color={disposalStatus.color} /></span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
}

const DisposedFoldersView: React.FC = () => {
    const { getDepartmentName } = useArchive();
    const [disposals, setDisposals] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const fetchDisposals = async () => {
        setIsLoading(true);
        try {
            const data = await api.getDisposals();
            setDisposals(data);
        } catch (error: any) {
            if (error.message && !error.message.includes('Failed to fetch')) {
                toast.error(`İmha edilmiş klasörler alınamadı: ${error.message}`);
            }
            setDisposals([]);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchDisposals();
    }, []);

    // Use SSE hook for real-time updates (only folder_updated for disposal records)
    useDisposalSSE(fetchDisposals);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="overflow-hidden p-2">
            <p className="text-sm text-gray-700 dark:text-gray-400 mb-4 transition-colors duration-300">{disposals.length} adet imha edilmiş klasör bulundu.</p>
            {disposals.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    Henüz imha edilmiş klasör bulunmuyor.
                </div>
            ) : (
                <div className="space-y-3">
                    {disposals.map(disposal => {
                        const folder = disposal.originalFolderData;
                        return (
                            <div key={disposal.id} className="p-3 border rounded-lg dark:border-gray-600 bg-white dark:bg-archive-dark-panel transition-all duration-300 hover:shadow-md">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge text={folder.category} color={folder.category === Category.Tibbi ? 'green' : 'blue'} />
                                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{getDepartmentName(folder.departmentId)} - {folder.subject}</h4>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4">
                                    <span><strong>Dosya Kodu:</strong> {folder.fileCode}</span>
                                    <span><strong>Dosya Yılı:</strong> {folder.fileYear}</span>
                                    <span><strong>Dosya Sayısı:</strong> {folder.fileCount}</span>
                                    <span><strong>Saklama:</strong> {folder.retentionPeriod}-{folder.retentionCode}</span>
                                    {folder.clinic && <span><strong>Klinik:</strong> {folder.clinic}</span>}
                                    {folder.specialInfo && <span><strong>Özel Bilgi:</strong> {folder.specialInfo}</span>}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    <strong>Lokasyon:</strong>{' '}
                                    {folder.location?.storageType === 'Kompakt' 
                                        ? `Ünite ${folder.location.unit} - ${folder.location.face} - ${folder.location.section}.Bölüm - ${folder.location.shelf}.Raf`
                                        : `Stand ${folder.location?.stand} - ${folder.location?.shelf}.Raf`}
                                </div>
                                <div className="mt-1.5 flex items-center gap-3 text-xs">
                                    <span className="flex items-center gap-1"><strong>Durum:</strong> <Badge text="İmha Edildi" color="red" /></span>
                                    <span><strong>İmha Tarihi:</strong> {new Date(disposal.disposalDate).toLocaleDateString('tr-TR')}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export const Disposal: React.FC<{ initialTab?: DisposalTabType, initialFilter?: DisposalViewType }> = ({ initialTab, initialFilter }) => {
    const [activeTab, setActiveTab] = useState<DisposalTabType>(initialTab || 'disposable');
    
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    return (
        <div className="p-5">
            <div className="bg-white dark:bg-archive-dark-panel p-4 rounded-xl shadow-lg transition-colors duration-300">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white transition-colors duration-300">İmha Yönetimi</h2>
                </div>

                <div className="flex space-x-1 border-b dark:border-gray-600 mb-3 transition-colors duration-300">
                    <button onClick={() => setActiveTab('disposable')} className={`px-3 py-1.5 text-sm font-medium transition-colors duration-300 ${activeTab === 'disposable' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 dark:text-gray-400'}`}>İmha Bekleyenler</button>
                    <button onClick={() => setActiveTab('disposed')} className={`px-3 py-1.5 text-sm font-medium transition-colors duration-300 ${activeTab === 'disposed' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 dark:text-gray-400'}`}>İmha Edilenler</button>
                </div>
                
                {activeTab === 'disposable' ? <DisposableFoldersView initialFilter={initialFilter} /> : <DisposedFoldersView />}

            </div>
        </div>
    );
};

export default Disposal;
