import { useState } from 'react';
import { AccordionSections } from '../types';

export const useAccordionState = () => {
  const [openSections, setOpenSections] = useState<AccordionSections>({
    measurements: false, // Ölçü Tanımları - default kapalı
    system: false,       // Sistem Ayarları
    departments: false,  // Birim Yönetimi
    storage: false,      // Lokasyon Yönetimi
    backup: false,       // Yedekleme Ayarları
    users: false,        // Kullanıcı Yönetimi
    updates: false       // Güncelleme Yönetimi
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
