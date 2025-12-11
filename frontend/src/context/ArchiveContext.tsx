import { createContext, useContext } from 'react';
import { ArchiveContextType } from '@/types';

export const ArchiveContext = createContext<ArchiveContextType | undefined>(undefined);

export const useArchive = () => {
  const context = useContext(ArchiveContext);
  if (context === undefined) {
    throw new Error('useArchive must be used within an ArchiveProvider');
  }
  return context;
};