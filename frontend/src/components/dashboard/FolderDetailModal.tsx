import React, { ReactNode } from 'react';
import { Modal } from '@/components/Modal';
import { Folder, Category, FolderStatus } from '@/types';
import { Badge } from '@/components/Badge';
import { FileText } from 'lucide-react';

interface FolderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: Folder | null;
  getDepartmentName: (id: number) => string;
}

const DetailItem: React.FC<{ label: string; value?: ReactNode | null }> = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="py-2 px-3 bg-gray-50 dark:bg-slate-700/50 rounded-md">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm text-gray-900 dark:text-gray-200">{value}</p>
    </div>
  );
};

export const FolderDetailModal: React.FC<FolderDetailModalProps> = ({ isOpen, onClose, folder, getDepartmentName }) => {
  if (!isOpen || !folder) return null;

  const getStatusBadge = () => {
    let color: 'green' | 'yellow' | 'red' | 'gray' = 'gray';
    if (folder.status === FolderStatus.Arsivde) color = 'green';
    else if (folder.status === FolderStatus.Cikista) color = 'yellow';
    else if (folder.status === FolderStatus.Imha) color = 'red';
    return <Badge text={folder.status} color={color} />;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Klasör Detayları"
      onConfirm={onClose}
      confirmText="Kapat"
      confirmColor="bg-gray-500 hover:bg-gray-600"
    >
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b pb-2 mb-3 dark:border-gray-600">{folder.subject}</h3>
        <div className="grid grid-cols-2 gap-3">
          <DetailItem label="Birim" value={getDepartmentName(folder.departmentId)} />
          <DetailItem label="Kategori" value={folder.category} />
          {folder.category === Category.Tibbi && <DetailItem label="Klinik" value={folder.clinic} />}
          <DetailItem label="Dosya Kodu" value={folder.fileCode} />
          <DetailItem label="Dosya Yılı" value={folder.fileYear} />
          <DetailItem label="Dosya Sayısı" value={folder.fileCount} />
          <DetailItem label="Birim Kodu" value={folder.unitCode} />
          <DetailItem label="Klasör Tipi" value={folder.folderType} />
          <DetailItem label="Saklama Süresi" value={`${folder.retentionPeriod} Yıl`} />
          <DetailItem label="Saklama Kodu" value={folder.retentionCode} />
          <DetailItem label="Durum" value={getStatusBadge()} />
          {folder.pdfPath && <DetailItem label="PDF" value="Mevcut" />}
        </div>
        {folder.specialInfo && (
            <div className="col-span-2">
                <DetailItem label="Özel Bilgi" value={folder.specialInfo} />
            </div>
        )}
        
        {folder.pdfPath && (
          <div className="mt-4">
            <a
              href={`/api/serve-pdf/${folder.pdfPath}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-300"
            >
              <FileText size={16} /> PDF Görüntüle
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
};
