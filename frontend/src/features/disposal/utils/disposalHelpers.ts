import { Folder, FolderStatus } from '../types';
import type { DisposalStatus } from '../types';

/**
 * Calculate disposal status for a folder
 * Disposal occurs 1 year after retention period ends
 */
export const getDisposalStatus = (folder: Folder): DisposalStatus => {
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

/**
 * Get badge color based on folder status
 */
export const getStatusBadgeColor = (status: FolderStatus): 'green' | 'yellow' | 'gray' => {
  switch (status) {
    case FolderStatus.Arsivde:
      return 'green';
    case FolderStatus.Cikista:
      return 'yellow';
    default:
      return 'gray';
  }
};
