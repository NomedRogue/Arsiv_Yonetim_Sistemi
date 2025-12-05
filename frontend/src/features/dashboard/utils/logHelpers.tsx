import React from 'react';
import { Log } from '@/types';
import { 
  FileText, Settings, Save, Trash2, ShieldAlert, ShieldCheck, 
  FolderPlus, Edit, FileOutput, RotateCcw, BookX, 
  FolderCog, FolderMinus, HardDrive, HardDriveDownload
} from 'lucide-react';

/**
 * Maps log type to corresponding icon with appropriate color
 */
export const getLogIcon = (log: Log): React.ReactNode => {
  const iconProps = { size: 16 };
  
  // Log tipine göre ikon ve renk belirleme
  switch (log.type) {
    case 'settings_update':
      return <Settings {...iconProps} className="text-gray-500 dark:text-gray-400" />;
    case 'backup':
      return <Save {...iconProps} className="text-blue-500" />;
    case 'backup_cleanup':
      return <HardDrive {...iconProps} className="text-yellow-500" />;
    case 'backup_delete':
      return <HardDriveDownload {...iconProps} className="text-rose-500" />;
    case 'backup_error':
      return <ShieldAlert {...iconProps} className="text-red-500" />;
    case 'restore':
      return <ShieldCheck {...iconProps} className="text-green-500" />;
    case 'create':
      return <FolderPlus {...iconProps} className="text-green-500" />;
    case 'update':
      return <Edit {...iconProps} className="text-blue-500" />;
    case 'delete':
      return <FolderMinus {...iconProps} className="text-red-500" />;
    case 'checkout':
    case 'checkout_update':
      return <FileOutput {...iconProps} className="text-orange-500" />;
    case 'return':
      return <RotateCcw {...iconProps} className="text-teal-500" />;
    case 'dispose':
      return <BookX {...iconProps} className="text-purple-500" />;
    case 'department_add':
    case 'department_update':
    case 'department_delete':
    case 'location_add':
    case 'location_update':
    case 'location_delete':
      return <FolderCog {...iconProps} className="text-indigo-500" />;
    default:
      return <FileText {...iconProps} className="text-gray-500 dark:text-gray-400" />;
  }
};
