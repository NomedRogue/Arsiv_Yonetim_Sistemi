import { useState } from 'react';
import { AccordionSections } from '../types';

export const useAccordionState = () => {
  const [openSections, setOpenSections] = useState<AccordionSections>({
    measurements: true,  // Ölçü Tanımları - default açık
    system: false,       // Sistem Ayarları
    departments: false,  // Birim Yönetimi
    storage: false,      // Lokasyon Yönetimi
    backup: false        // Yedekleme Ayarları
  });

  const toggleSection = (section: keyof AccordionSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return {
    openSections,
    toggleSection,
  };
};
