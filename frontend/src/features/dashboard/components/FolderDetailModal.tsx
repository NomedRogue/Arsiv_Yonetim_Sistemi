import React, { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { openFileWithSystem } from '@/lib/fileUtils';
import { Folder, Category, FolderStatus } from '@/types';
import { Badge } from '@/components/Badge';
import { FileText, FileSpreadsheet } from 'lucide-react';

interface FolderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: Folder | null;
  getDepartmentName: (id: number) => string;
}

// Reusable DetailField component for clean, consistent field display
const DetailField: React.FC<{ label: string; value?: ReactNode | null; fullWidth?: boolean }> = ({ 
  label, 
  value, 
  fullWidth = false 
}) => {
  if (!value && value !== 0) return null;
  
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">
        {label}
      </dt>
      <dd className="text-sm font-medium text-gray-900 dark:text-white">
        {value}
      </dd>
    </div>
  );
};

// Section title component for grouping information
const SectionTitle: React.FC<{ children: ReactNode }> = ({ children }) => (
  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 mt-4 first:mt-0">
    {children}
  </h4>
);

export const FolderDetailModal: React.FC<FolderDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  folder, 
  getDepartmentName 
}) => {
  // Handle Escape key and prevent body scroll
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !folder) return null;

  const getStatusBadge = () => {
    let color: 'green' | 'yellow' | 'red' | 'gray' = 'gray';
    let displayText: string = folder.status;
    
    if (folder.status === FolderStatus.Arsivde) {
      color = 'green';
      displayText = 'Arşivde';
    } else if (folder.status === FolderStatus.Cikista) {
      color = 'yellow';
      displayText = 'Çıkışta';
    } else if (folder.status === FolderStatus.Imha) {
      color = 'red';
      displayText = 'İmha Edildi';
    }
    
    return <Badge text={displayText} color={color} />;
  };

  const hasAttachments = folder.pdfPath || folder.excelPath;

  const content = (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4" 
      aria-modal="true" 
      role="dialog"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Container - Reduced width from max-w-2xl to max-w-lg */}
      <div className="relative z-[10001] bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col transform transition-all">
        
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Klasör Detayları
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-slate-700 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable only if needed */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {/* Subject Header */}
          <div className="mb-4 pb-3 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
              {folder.subject}
            </h3>
          </div>

          {/* Dosya Bilgileri Section */}
          <SectionTitle>Dosya Bilgileri</SectionTitle>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
            <DetailField label="Birim" value={getDepartmentName(folder.departmentId)} />
            <DetailField label="Kategori" value={folder.category === Category.Tibbi ? 'Tıbbi' : 'İdari'} />
            {folder.category === Category.Tibbi && folder.clinic && (
              <DetailField label="Klinik" value={folder.clinic} />
            )}
            <DetailField label="Dosya Kodu" value={folder.fileCode} />
            <DetailField label="Birim Kodu" value={folder.unitCode} />
            <DetailField label="Dosya Yılı" value={folder.fileYear} />
            <DetailField label="Dosya Sayısı" value={folder.fileCount} />
            <DetailField label="Klasör Tipi" value={folder.folderType} />
          </dl>

          {/* Arşiv Bilgileri Section */}
          <SectionTitle>Arşiv Bilgileri</SectionTitle>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
            <DetailField label="Saklama Süresi" value={`${folder.retentionPeriod} Yıl`} />
            <DetailField label="Saklama Kodu" value={folder.retentionCode} />
            <DetailField label="Durum" value={getStatusBadge()} />
          </dl>

          {/* Ek Bilgiler Section */}
          {folder.specialInfo && (
            <>
              <SectionTitle>Ek Bilgiler</SectionTitle>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <DetailField label="Özel Bilgi" value={folder.specialInfo} fullWidth />
              </dl>
            </>
          )}
        </div>

        {/* Sticky Footer with Action Buttons */}
        {hasAttachments && (
          <div className="flex-shrink-0 px-5 py-3 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-200 dark:border-slate-700 rounded-b-xl">
            <div className="flex items-center justify-end gap-2">
              {folder.pdfPath && (
                <button
                  onClick={() => openFileWithSystem(folder.pdfPath!, 'pdf')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  PDF Görüntüle
                </button>
              )}
              
              {folder.excelPath && (
                <button
                  onClick={() => openFileWithSystem(folder.excelPath!, 'excel')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel Aç
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
