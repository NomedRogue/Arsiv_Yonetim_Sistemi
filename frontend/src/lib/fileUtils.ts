import { toast } from './toast';

// API URL helper
export const getApiUrl = (path: string) => {
  const baseUrl = import.meta.env.DEV ? '/api' : 'http://localhost:3001/api';
  return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
};

// Dosyayı sistem varsayılan uygulamasıyla aç
export const openFileWithSystem = async (filename: string, fileType: 'pdf' | 'excel') => {
  try {
    // Electron API mevcut mu kontrol et
    if (window.electronAPI && window.electronAPI.openFile) {
      // Dosya yolunu backend'den al
      const endpoint = fileType === 'pdf' ? '/pdf/pdf-path/' : '/excel/excel-path/';
      const response = await fetch(getApiUrl(`${endpoint}${filename}`));
      
      if (!response.ok) {
        throw new Error('Dosya bulunamadı');
      }
      
      const { filePath } = await response.json();
      
      // Electron ile dosyayı aç
      const result = await window.electronAPI.openFile(filePath);
      
      if (!result.success) {
        throw new Error(result.error || 'Dosya açılamadı');
      }
    } else {
      // Web versiyonu için - tarayıcıda aç
      const endpoint = fileType === 'pdf' ? '/pdf/serve-pdf/' : '/excel/serve-excel/';
      window.open(getApiUrl(`${endpoint}${filename}`), '_blank');
    }
  } catch (error) {
    console.error('File open error:', error);
    toast.error(`${fileType === 'pdf' ? 'PDF' : 'Excel'} açılırken hata oluştu`);
  }
};

// TypeScript için window.electronAPI type declaration
declare global {
  interface Window {
    electronAPI?: {
      openFolderDialog: () => Promise<string | null>;
      openFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      savePdfToDownloads: (fileName: string, base64Data: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    };
  }
}
