import React, { useMemo, useState, useEffect } from 'react';
import { useArchive } from '@/context/ArchiveContext';
import { Category, Folder, FolderStatus } from '@/types';
import { Modal } from '@/components/Modal';
import { Badge } from '@/components/Badge';
import * as api from '@/api';
import { toast } from '@/lib/toast';
import { Loader2 } from 'lucide-react';

const getDisposalStatus = (folder: Folder): { text: string; color: 'red' | 'orange' | 'yellow' | 'gray' } => {
    const currentYear = new Date().getFullYear();
    // DOĞRU: İmha, saklama süresi tamamlandıktan sonraki yıl yapılır.
    // Saklama süresi bitiminden 1 yıl sonra imha edilir
    const disposalYear = folder.fileYear + folder.retentionPeriod + 1;
    const yearsRemaining = disposalYear - currentYear;

    if (yearsRemaining < 0) {
        return { text: `Gecikti (${-yearsRemaining} Yıl)`, color: 'red' };
    }
    if (yearsRemaining === 0) {
        return { text: 'Bu Yıl', color: 'orange' };
    }
    if (yearsRemaining === 1) {
        return { text: '1 Yıl Kaldı', color: 'yellow' };
    }
    return { text: `${yearsRemaining} Yıl`, color: 'gray' };
};

const getStatusBadgeColor = (status: FolderStatus) => {
    switch (status) {
        case FolderStatus.Arsivde: return 'green';
        case FolderStatus.Cikista: return 'yellow';
        default: return 'gray';
    }
};

const DisposableFoldersView: React.FC<{ initialFilter?: 'thisYear' | 'nextYear' | 'overdue' }> = ({ initialFilter }) => {
    const { getDepartmentName, disposeFolders } = useArchive();
    const [selectedView, setSelectedView] = useState<'thisYear' | 'nextYear' | 'overdue'>(initialFilter || 'thisYear');
    const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [disposableFolders, setDisposableFolders] = useState<Folder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const fetchFolders = async () => {
            setIsLoading(true);
            try {
                const data = await api.getDisposableFolders(selectedView);
                setDisposableFolders(data);
            } catch (error: any) {
                toast.error(`İmha edilecek klasörler alınamadı: ${error.message}`);
                setDisposableFolders([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFolders();
    }, [selectedView]);

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

    const handleConfirmDisposal = () => {
        disposeFolders(selectedFolderIds);
        setDisposableFolders(prev => prev.filter(f => !selectedFolderIds.includes(f.id)));
        setSelectedFolderIds([]);
        setIsModalOpen(false);
    };

    return (
        <>
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="İmha Onayı"
                onConfirm={handleConfirmDisposal}
                confirmText={`Evet, ${selectedFolderIds.length} Klasörü İmha Et`}
            >
                <p>
                    Seçili <span className="font-bold">{selectedFolderIds.length}</span> adet klasör kalıcı olarak imha edilecek ve PDF'leri silinecektir.
                    Bu işlem geri alınamaz. Emin misiniz?
                </p>
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
                                    className="p-4 border rounded-lg dark:border-gray-600 bg-white dark:bg-archive-dark-panel transition-all duration-300 hover:shadow-lg hover:scale-[1.01] cursor-pointer flex items-start gap-4"
                                    onClick={() => handleSelectFolder(folder.id)}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={selectedFolderIds.includes(folder.id)} 
                                        readOnly
                                        className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                                    />
                                    <div className="flex-grow">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <Badge text={folder.category} color={folder.category === Category.Tibbi ? 'green' : 'blue'} />
                                            <h4 className="font-bold text-lg">{getDepartmentName(folder.departmentId)} - {folder.subject}</h4>
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                                            <span><strong>Dosya Kodu:</strong> {folder.fileCode}</span>
                                            <span><strong>Dosya Yılı:</strong> {folder.fileYear}</span>
                                            <span><strong>Dosya Sayısı:</strong> {folder.fileCount}</span>
                                            {folder.clinic && <span><strong>Klinik:</strong> {folder.clinic}</span>}
                                        </div>
                                        {folder.specialInfo && (
                                            <div className="text-sm mt-1 text-gray-500 dark:text-gray-400">
                                                <strong>Özel Bilgi:</strong> {folder.specialInfo}
                                            </div>
                                        )}
                                        <div className="text-sm mt-1">
                                            <strong>Lokasyon:</strong>{' '}
                                            {folder.location.storageType === 'Kompakt' ? `Ünite ${folder.location.unit}-${folder.location.face?.charAt(0)}` : `Stand ${folder.location.stand}`}
                                            - Raf {folder.location.shelf}
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <span><strong>Durum: </strong><Badge text={folder.status} color={getStatusBadgeColor(folder.status)} /></span>
                                            <span><strong>İmhaya: </strong><Badge text={disposalStatus.text} color={disposalStatus.color} /></span>
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
    const { disposals, getDepartmentName } = useArchive();

    return (
        <div className="overflow-hidden p-2">
            <p className="text-sm text-gray-700 dark:text-gray-400 mb-4 transition-colors duration-300">{disposals.length} adet imha edilmiş klasör bulundu.</p>
            <div className="space-y-3">
                {disposals.map(disposal => {
                    const folder = disposal.originalFolderData;
                    return (
                        <div key={disposal.id} className="p-4 border rounded-lg dark:border-gray-600 bg-white dark:bg-archive-dark-panel transition-all duration-300 hover:shadow-lg hover:scale-[1.01]">
                            <div className="flex items-center space-x-2 mb-1">
                                <Badge text={folder.category} color={folder.category === Category.Tibbi ? 'green' : 'blue'} />
                                <h4 className="font-bold text-lg">{getDepartmentName(folder.departmentId)} - {folder.subject}</h4>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                                <span><strong>Dosya Kodu:</strong> {folder.fileCode}</span>
                                <span><strong>Dosya Yılı:</strong> {folder.fileYear}</span>
                                <span><strong>Dosya Sayısı:</strong> {folder.fileCount}</span>
                                {folder.clinic && <span><strong>Klinik:</strong> {folder.clinic}</span>}
                            </div>
                            {folder.specialInfo && (
                                <div className="text-sm mt-1 text-gray-500 dark:text-gray-400">
                                    <strong>Özel Bilgi:</strong> {folder.specialInfo}
                                </div>
                            )}
                            <div className="mt-2 flex flex-wrap gap-4">
                                <span><strong>Durum: </strong><Badge text="İmha Edildi" color="red" /></span>
                                <span><strong>İmha Tarihi: </strong>{new Date(disposal.disposalDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export const Disposal: React.FC<{ initialTab?: 'disposable' | 'disposed', initialFilter?: 'thisYear' | 'nextYear' | 'overdue' }> = ({ initialTab, initialFilter }) => {
    const [activeTab, setActiveTab] = useState<'disposable' | 'disposed'>(initialTab || 'disposable');
    
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    return (
        <div className="p-6">
            <div className="bg-white dark:bg-archive-dark-panel p-6 rounded-xl shadow-lg transition-colors duration-300">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">İmha Yönetimi</h2>
                </div>

                <div className="flex space-x-1 border-b dark:border-gray-600 mb-4 transition-colors duration-300">
                    <button onClick={() => setActiveTab('disposable')} className={`px-4 py-2 text-sm font-medium transition-colors duration-300 ${activeTab === 'disposable' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 dark:text-gray-400'}`}>İmha Bekleyenler</button>
                    <button onClick={() => setActiveTab('disposed')} className={`px-4 py-2 text-sm font-medium transition-colors duration-300 ${activeTab === 'disposed' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 dark:text-gray-400'}`}>İmha Edilenler</button>
                </div>
                
                {activeTab === 'disposable' ? <DisposableFoldersView initialFilter={initialFilter} /> : <DisposedFoldersView />}

            </div>
        </div>
    );
};

export default Disposal;