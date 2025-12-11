import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Calendar,
  Trash2,
  AlertTriangle,
  Clock,
  FolderOpen,
  FileDown,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Archive,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as api from '@/api';
import { toast } from '@/lib/toast';
import { useArchive } from '@/context/ArchiveContext';
import { DejaVuSansCondensedBase64 } from '@/assets/fonts/DejaVuSansCondensed';

// jsPDF'e Türkçe font ekle
const addTurkishFont = (doc: jsPDF): void => {
  doc.addFileToVFS('DejaVuSansCondensed.ttf', DejaVuSansCondensedBase64);
  doc.addFont('DejaVuSansCondensed.ttf', 'DejaVu', 'normal');
  doc.setFont('DejaVu');
};

interface DisposalYearData {
  year: number | string;
  count: number;
  label?: string;
  isOverdue?: boolean;
  isCurrentYear?: boolean;
}

interface ReportFolder {
  id: number;
  category: string;
  departmentId: number;
  departmentName?: string;
  subject: string;
  fileCode: string;
  fileYear: number;
  fileCount?: number;
  clinic?: string;
  specialInfo?: string;
  retentionPeriod: number;
  retentionCode: string;
  disposalYear?: number;
  location?: {
    storageType: string;
    unit?: number;
    face?: string;
    section?: number;
    shelf?: number;
    stand?: number;
  };
  status?: string;
}

interface DisposalRecord {
  id: string;
  folderId: number;
  disposalDate: string;
  originalFolderData: ReportFolder;
}

// Lokasyon bilgisini tam formatta döndür
const getFullLocationString = (location: any): string => {
  if (!location) return '-';
  if (location.storageType === 'Kompakt') {
    return `Ünite ${location.unit || '-'} - ${location.face || '-'} - ${location.section || '-'}.Bölüm - ${location.shelf || '-'}.Raf`;
  } else {
    return `Stand ${location.stand || '-'} - ${location.shelf || '-'}.Raf`;
  }
};

export const Reports: React.FC = () => {
  const { settings, getDepartmentName } = useArchive();
  const [activeTab, setActiveTab] = useState<'overdue' | 'toDispose' | 'disposed'>('overdue');
  const [disposalSchedule, setDisposalSchedule] = useState<DisposalYearData[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | string | null>(null);
  const [yearFolders, setYearFolders] = useState<ReportFolder[]>([]);
  const [disposedFolders, setDisposedFolders] = useState<DisposalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedYear, setExpandedYear] = useState<number | string | null>(null);
  const [overdueFolders, setOverdueFolders] = useState<ReportFolder[]>([]);

  // İmha süresi geçen klasörleri yükle
  const loadOverdueFolders = useCallback(async () => {
    try {
      setIsLoading(true);
      const folders = await api.getDisposalYearFolders('overdue');
      setOverdueFolders(folders);
    } catch (error: any) {
      toast.error('Süresi geçmiş klasörler yüklenemedi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // İmha takvimini yükle
  const loadDisposalSchedule = useCallback(async () => {
    try {
      setIsLoading(true);
      const stats = await api.getDashboardStats('all', 'last12');
      // Gecikmiş olanları filtrele (ayrı tab'da gösterilecek)
      const schedule = (stats.disposalSchedule || []).filter((item: DisposalYearData) => !item.isOverdue);
      setDisposalSchedule(schedule);
    } catch (error: any) {
      toast.error('İmha takvimi yüklenemedi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // İmha edilmiş klasörleri yükle
  const loadDisposedFolders = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getDisposals();
      setDisposedFolders(data);
    } catch (error: any) {
      if (error.message && !error.message.includes('Failed to fetch')) {
        toast.error('İmha edilmiş klasörler yüklenemedi: ' + error.message);
      }
      setDisposedFolders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'overdue') {
      loadOverdueFolders();
    } else if (activeTab === 'toDispose') {
      loadDisposalSchedule();
    } else {
      loadDisposedFolders();
    }
  }, [activeTab, loadOverdueFolders, loadDisposalSchedule, loadDisposedFolders]);

  // Belirli yıl için klasörleri yükle
  const loadYearFolders = async (year: number | string) => {
    try {
      setIsLoading(true);
      const yearParam = year === 'Gecikmiş' ? 'overdue' : year;
      const folders = await api.getDisposalYearFolders(yearParam);
      setYearFolders(folders);
      setSelectedYear(year);
      setExpandedYear(year);
    } catch (error: any) {
      toast.error('Klasörler yüklenemedi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // PDF Rapor oluştur - İmha Edilecekler
  const generateToDisposePdfReport = async (year: number | string, folders: ReportFolder[], isOverdueTab: boolean = false) => {
    if (folders.length === 0) {
      toast.info('Klasör bulunmuyor.');
      return;
    }

    setIsGenerating(true);
    
    try {
      const isOverdue = isOverdueTab || year === 'Gecikmiş' || year === 'overdue';
      const title = isOverdue 
        ? 'İmha Süresi Geçmiş Klasörler Raporu'
        : `${year} Yılı İmha Edilecek Klasörler Raporu`;
      const today = new Date().toLocaleDateString('tr-TR');
      const fileName = isOverdue ? `imha_suresi_gecmis_${Date.now()}.pdf` : `imha_edilecek_${year}_${Date.now()}.pdf`;

      // jsPDF ile PDF oluştur - A4 Dikey
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Türkçe font ekle
      addTurkishFont(doc);
      
      const pageWidth = 210;
      const pageHeight = 297;
      
      // Kurumsal Header - Üst çizgi
      doc.setFillColor(isOverdue ? 185 : 30, isOverdue ? 28 : 58, isOverdue ? 28 : 138);
      doc.rect(0, 0, pageWidth, 8, 'F');
      
      // Başlık
      doc.setFontSize(14);
      doc.setTextColor(33, 33, 33);
      doc.text(title, pageWidth / 2, 18, { align: 'center' });
      
      // Alt çizgi - tablo ile aynı margin
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(6, 22, pageWidth - 6, 22);
      
      // Meta bilgi - tablo ile aynı margin (6mm)
      const marginLeft = 6;
      const marginRight = 6;
      const contentWidth = pageWidth - marginLeft - marginRight;
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Rapor Tarihi: ${today}`, marginLeft, 28);
      doc.text(`Toplam: ${folders.length} klasör`, pageWidth - marginRight, 28, { align: 'right' });
      
      // Özet kutusu
      const tibbi = folders.filter(f => f.category === 'Tıbbi').length;
      const idari = folders.filter(f => f.category === 'İdari').length;
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(marginLeft, 31, contentWidth, 8, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text(`Toplam: ${folders.length}  |  Tıbbi: ${tibbi}  |  İdari: ${idari}`, pageWidth / 2, 36, { align: 'center' });

      // Tablo verisi - A4 dikey için optimize edilmiş (UI ile aynı başlıklar)
      const tableData = folders.map((f, i) => {
        const locationStr = getFullLocationString(f.location);
        const disposalYear = f.disposalYear || (f.fileYear + f.retentionPeriod + 1);
        return [
          (i + 1).toString(),
          f.category || '-',
          f.departmentName || '-',
          f.subject || '-',
          f.fileCode || '-',
          f.fileYear?.toString() || '-',
          f.retentionPeriod ? `${f.retentionPeriod} yıl` : '-',
          f.retentionCode || '-',
          disposalYear.toString(),
          f.clinic || '-',
          f.specialInfo || '-',
          locationStr,
          f.status || 'Arşivde'
        ];
      });

      // Tablo - A4 dikey format, küçük font
      autoTable(doc, {
        startY: 42,
        head: [[
          '#', 
          'Kategori', 
          'Departman', 
          'Konu', 
          'Dosya Kodu', 
          'Dosya Yılı', 
          'Saklama Süresi', 
          'Saklama Kodu', 
          'İmha Yılı', 
          'Klinik', 
          'Özel Bilgi', 
          'Lokasyon', 
          'Durum'
        ]],
        body: tableData,
        styles: { 
          font: 'DejaVu',
          fontSize: 6, 
          cellPadding: 1.5, 
          overflow: 'linebreak',
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
          minCellHeight: 4
        },
        headStyles: { 
          fillColor: isOverdue ? [185, 28, 28] : [30, 58, 138], 
          textColor: 255, 
          fontStyle: 'normal', 
          fontSize: 6,
          halign: 'center',
          minCellHeight: 5
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
          0: { cellWidth: 6, halign: 'center' },   // #
          1: { cellWidth: 12 },                     // Kategori
          2: { cellWidth: 18 },                     // Departman
          3: { cellWidth: 'auto', minCellWidth: 30 },  // Konu - otomatik genişlik
          4: { cellWidth: 12 },                     // Dosya Kodu
          5: { cellWidth: 10, halign: 'center' },   // Dosya Yılı
          6: { cellWidth: 14, halign: 'center' },   // Saklama Süresi
          7: { cellWidth: 12, halign: 'center' },   // Saklama Kodu
          8: { cellWidth: 10, halign: 'center' },   // İmha Yılı
          9: { cellWidth: 14 },                     // Klinik
          10: { cellWidth: 'auto', minCellWidth: 20 }, // Özel Bilgi - otomatik genişlik
          11: { cellWidth: 'auto', minCellWidth: 30 }, // Lokasyon - otomatik genişlik
          12: { cellWidth: 12, halign: 'center' }   // Durum
        },
        margin: { left: 6, right: 6 },
        tableWidth: 'auto',
        didDrawPage: (data) => {
          // Her sayfada header tekrarla
          if (data.pageNumber > 1) {
            doc.setFillColor(isOverdue ? 185 : 30, isOverdue ? 28 : 58, isOverdue ? 28 : 138);
            doc.rect(0, 0, 210, 5, 'F');
          }
          // Footer
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(7);
          doc.setTextColor(130, 130, 130);
          doc.text('Arşiv Yönetim Sistemi', 15, 287);
          doc.text(`Sayfa ${data.pageNumber} / ${pageCount}`, 195, 287, { align: 'right' });
          
          // Alt çizgi
          doc.setDrawColor(isOverdue ? 185 : 30, isOverdue ? 28 : 58, isOverdue ? 28 : 138);
          doc.setLineWidth(1);
          doc.line(0, 292, 210, 292);
        }
      });

      // PDF'i base64'e çevir ve Electron API ile kaydet
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      if (window.electronAPI?.savePdfToDownloads) {
        const result = await window.electronAPI.savePdfToDownloads(fileName, pdfBase64);
        if (result.success) {
          toast.success('PDF raporu başarıyla oluşturuldu');
        } else {
          toast.error('PDF kaydedilemedi: ' + result.error);
        }
      } else {
        doc.save(fileName);
        toast.success('PDF raporu başarıyla oluşturuldu');
      }
    } catch (error: any) {
      toast.error('Rapor oluşturulamadı: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // PDF Rapor oluştur - İmha Edilenler
  const generateDisposedPdfReport = async () => {
    if (disposedFolders.length === 0) {
      toast.info('İmha edilmiş klasör bulunmuyor.');
      return;
    }

    setIsGenerating(true);
    
    try {
      const title = 'İmha Edilmiş Klasörler Raporu';
      const today = new Date().toLocaleDateString('tr-TR');
      const fileName = `imha_edilmis_${Date.now()}.pdf`;

      // jsPDF ile PDF oluştur - Portrait A4
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Türkçe font ekle
      addTurkishFont(doc);
      
      // Kurumsal Header - Üst çizgi
      doc.setFillColor(22, 128, 58);
      doc.rect(0, 0, 210, 8, 'F');
      
      // Başlık
      doc.setFontSize(14);
      doc.setTextColor(33, 33, 33);
      doc.text(title, 105, 18, { align: 'center' });
      
      // Alt çizgi - tablo ile aynı margin
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(6, 22, 204, 22);
      
      // Meta bilgi - tablo ile aynı margin (6mm)
      const marginLeft = 6;
      const marginRight = 6;
      const pageWidth = 210;
      const contentWidth = pageWidth - marginLeft - marginRight;
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Rapor Tarihi: ${today}`, marginLeft, 28);
      doc.text(`Toplam: ${disposedFolders.length} klasör`, pageWidth - marginRight, 28, { align: 'right' });
      
      // Özet kutusu
      const tibbi = disposedFolders.filter(d => d.originalFolderData?.category === 'Tıbbi').length;
      const idari = disposedFolders.filter(d => d.originalFolderData?.category === 'İdari').length;
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(marginLeft, 31, contentWidth, 8, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);
      doc.text(`Toplam: ${disposedFolders.length}  |  Tıbbi: ${tibbi}  |  İdari: ${idari}`, pageWidth / 2, 36, { align: 'center' });

      // Tablo verisi - Portrait için optimize (UI ile aynı başlıklar)
      const tableData = disposedFolders.map((d, i) => {
        const f = d.originalFolderData;
        const locationStr = getFullLocationString(f?.location);
        return [
          (i + 1).toString(),
          f?.category || '-',
          f?.departmentName || 'Bilinmiyor',
          f?.subject || '-',
          f?.fileCode || '-',
          f?.fileYear?.toString() || '-',
          f?.retentionPeriod ? `${f.retentionPeriod} yıl` : '-',
          f?.retentionCode || '-',
          new Date(d.disposalDate).toLocaleDateString('tr-TR'),
          locationStr
        ];
      });

      // Tablo - Portrait A4 için optimize edilmiş, küçük font (UI ile aynı başlıklar)
      autoTable(doc, {
        startY: 42,
        head: [[
          '#', 
          'Kategori', 
          'Departman', 
          'Konu', 
          'Dosya Kodu', 
          'Dosya Yılı', 
          'Saklama Süresi', 
          'Saklama Kodu', 
          'İmha Tarihi', 
          'Lokasyon'
        ]],
        body: tableData,
        styles: { 
          font: 'DejaVu',
          fontSize: 6, 
          cellPadding: 1.5, 
          overflow: 'linebreak',
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
          minCellHeight: 4
        },
        headStyles: { 
          fillColor: [22, 128, 58], 
          textColor: 255, 
          fontStyle: 'normal', 
          fontSize: 6,
          halign: 'center',
          minCellHeight: 5
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
          0: { cellWidth: 6, halign: 'center' },   // #
          1: { cellWidth: 12 },                     // Kategori
          2: { cellWidth: 20 },                     // Departman
          3: { cellWidth: 'auto', minCellWidth: 35 },  // Konu - otomatik genişlik
          4: { cellWidth: 12 },                     // Dosya Kodu
          5: { cellWidth: 12, halign: 'center' },   // Dosya Yılı
          6: { cellWidth: 16, halign: 'center' },   // Saklama Süresi
          7: { cellWidth: 14, halign: 'center' },   // Saklama Kodu
          8: { cellWidth: 18, halign: 'center' },   // İmha Tarihi
          9: { cellWidth: 'auto', minCellWidth: 40 }   // Lokasyon - otomatik genişlik
        },
        margin: { left: 6, right: 6 },
        tableWidth: 'auto',
        didDrawPage: (data) => {
          // Her sayfada header tekrarla
          if (data.pageNumber > 1) {
            doc.setFillColor(22, 128, 58);
            doc.rect(0, 0, 210, 5, 'F');
          }
          // Footer
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(7);
          doc.setTextColor(130, 130, 130);
          doc.text('Arşiv Yönetim Sistemi', 15, 287);
          doc.text(`Sayfa ${data.pageNumber} / ${pageCount}`, 195, 287, { align: 'right' });
          
          // Alt çizgi
          doc.setDrawColor(22, 128, 58);
          doc.setLineWidth(1);
          doc.line(0, 292, 210, 292);
        }
      });

      // PDF'i base64'e çevir ve Electron API ile kaydet
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      if (window.electronAPI?.savePdfToDownloads) {
        const result = await window.electronAPI.savePdfToDownloads(fileName, pdfBase64);
        if (result.success) {
          toast.success('PDF raporu başarıyla oluşturuldu');
        } else {
          toast.error('PDF kaydedilemedi: ' + result.error);
        }
      } else {
        doc.save(fileName);
        toast.success('PDF raporu başarıyla oluşturuldu');
      }
    } catch (error: any) {
      toast.error('Rapor oluşturulamadı: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Yıl satırını toggle et
  const toggleYear = (year: number | string) => {
    if (expandedYear === year) {
      setExpandedYear(null);
      setYearFolders([]);
      setSelectedYear(null);
    } else {
      loadYearFolders(year);
    }
  };

  const getYearStyle = (item: DisposalYearData) => {
    if (item.isOverdue) return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    if (item.isCurrentYear) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    return 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-800 dark:text-white">Raporlar</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">İmha raporları</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'overdue') loadOverdueFolders();
            else if (activeTab === 'toDispose') loadDisposalSchedule();
            else loadDisposedFolders();
          }}
          disabled={isLoading}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {/* Tab Navigation - Sıra: İmha Süresi Geçenler > İmha Edilecekler > İmha Edilenler */}
      <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'overdue'
              ? 'border-red-500 text-red-600 dark:text-red-400 bg-white dark:bg-slate-800'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          İmha Süresi Geçenler
        </button>
        <button
          onClick={() => setActiveTab('toDispose')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'toDispose'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-slate-800'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          İmha Edilecekler
        </button>
        <button
          onClick={() => setActiveTab('disposed')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'disposed'
              ? 'border-green-500 text-green-600 dark:text-green-400 bg-white dark:bg-slate-800'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          İmha Edilenler
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-3">
        {/* İmha Süresi Geçenler Tab */}
        {activeTab === 'overdue' && (
          <div className="space-y-2">
            {/* Actions Bar */}
            {overdueFolders.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-red-700 dark:text-red-400 font-medium">{overdueFolders.length} klasörün imha süresi geçmiş!</span>
                </div>
                <button
                  onClick={() => generateToDisposePdfReport('overdue', overdueFolders, true)}
                  disabled={isGenerating}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
                  PDF
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : overdueFolders.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-50" />
                <p className="text-sm">İmha süresi geçmiş klasör bulunmuyor.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-red-200 dark:border-red-800">
                <table className="w-full text-xs">
                  <thead className="bg-red-100 dark:bg-red-900/30">
                    <tr>
                      <th className="px-2 py-2 text-left text-red-700 dark:text-red-300 w-8">#</th>
                      <th className="px-2 py-2 text-left text-red-700 dark:text-red-300">Kategori</th>
                      <th className="px-2 py-2 text-left text-red-700 dark:text-red-300">Departman</th>
                      <th className="px-2 py-2 text-left text-red-700 dark:text-red-300">Konu</th>
                      <th className="px-2 py-2 text-left text-red-700 dark:text-red-300">Dosya Kodu</th>
                      <th className="px-2 py-2 text-left text-red-700 dark:text-red-300">Dosya Yılı</th>
                      <th className="px-2 py-2 text-left text-red-700 dark:text-red-300">Saklama Süresi</th>
                      <th className="px-2 py-2 text-left text-red-700 dark:text-red-300">Saklama Kodu</th>
                      <th className="px-2 py-2 text-left text-red-700 dark:text-red-300">İmha Yılı</th>
                      <th className="px-2 py-2 text-left text-red-700 dark:text-red-300">Klinik</th>
                      <th className="px-2 py-2 text-left text-red-700 dark:text-red-300">Özel Bilgi</th>
                      <th className="px-2 py-2 text-left text-red-700 dark:text-red-300">Lokasyon</th>
                      <th className="px-2 py-2 text-left text-red-700 dark:text-red-300">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 dark:divide-red-900/30 bg-white dark:bg-slate-800">
                    {overdueFolders.map((folder, index) => {
                      const disposalYear = folder.disposalYear || (folder.fileYear + folder.retentionPeriod + 1);
                      const locationStr = getFullLocationString(folder.location);
                      return (
                        <tr key={folder.id} className="hover:bg-red-50 dark:hover:bg-red-900/10">
                          <td className="px-2 py-1.5 text-gray-400">{index + 1}</td>
                          <td className="px-2 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              folder.category === 'Tıbbi' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                            }`}>
                              {folder.category}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{folder.departmentName || getDepartmentName(folder.departmentId)}</td>
                          <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{folder.subject}</td>
                          <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{folder.fileCode}</td>
                          <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{folder.fileYear}</td>
                          <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{folder.retentionPeriod} yıl</td>
                          <td className="px-2 py-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 text-xs">
                              {folder.retentionCode}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-xs font-bold">
                              {disposalYear}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{folder.clinic || '-'}</td>
                          <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400 text-xs">{folder.specialInfo || '-'}</td>
                          <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400 text-xs">{locationStr}</td>
                          <td className="px-2 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              folder.status === 'Çıkış' 
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                            }`}>
                              {folder.status || 'Arşivde'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* İmha Edilecekler Tab */}
        {activeTab === 'toDispose' && (
          <div className="space-y-2">
            {isLoading && disposalSchedule.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : disposalSchedule.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">İmha takvimi verisi bulunamadı.</p>
              </div>
            ) : (
              disposalSchedule.map((item) => (
                <div key={item.year} className={`border rounded-lg overflow-hidden ${getYearStyle(item)}`}>
                  {/* Year Header */}
                  <button
                    onClick={() => item.count > 0 && toggleYear(item.label || item.year)}
                    disabled={item.count === 0}
                    className={`w-full flex items-center justify-between p-2 text-left ${
                      item.count > 0 ? 'hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer' : 'opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {item.isOverdue ? (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      ) : item.isCurrentYear ? (
                        <Clock className="w-4 h-4 text-orange-500" />
                      ) : (
                        <Calendar className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={`font-semibold text-sm ${
                        item.isOverdue ? 'text-red-700 dark:text-red-400' :
                        item.isCurrentYear ? 'text-orange-700 dark:text-orange-400' :
                        'text-gray-700 dark:text-gray-300'
                      }`}>
                        {item.label || item.year}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        item.isOverdue ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                        item.isCurrentYear ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' :
                        'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'
                      }`}>
                        {item.count} klasör
                      </span>
                      {item.count > 0 && (
                        expandedYear === (item.label || item.year) ? 
                          <ChevronUp className="w-4 h-4 text-gray-400" /> : 
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Folders */}
                  {expandedYear === (item.label || item.year) && yearFolders.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-slate-700">
                      {/* Actions Bar */}
                      <div className="p-2 bg-gray-50 dark:bg-slate-800/50 flex items-center justify-between border-b border-gray-200 dark:border-slate-700">
                        <span className="text-xs text-gray-500">{yearFolders.length} klasör</span>
                        <button
                          onClick={() => generateToDisposePdfReport(item.label || item.year, yearFolders, false)}
                          disabled={isGenerating}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors disabled:opacity-50"
                        >
                          {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
                          PDF
                        </button>
                      </div>
                      
                      {/* Folder Table */}
                      <div className="overflow-x-auto max-h-72">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-100 dark:bg-slate-700 sticky top-0">
                            <tr>
                              <th className="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300 w-8">#</th>
                              <th className="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300">Kategori</th>
                              <th className="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300">Departman</th>
                              <th className="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300">Konu</th>
                              <th className="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300">Dosya Kodu</th>
                              <th className="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300">Dosya Yılı</th>
                              <th className="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300">Saklama Süresi</th>
                              <th className="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300">Saklama Kodu</th>
                              <th className="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300">İmha Yılı</th>
                              <th className="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300">Klinik</th>
                              <th className="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300">Özel Bilgi</th>
                              <th className="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300">Lokasyon</th>
                              <th className="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300">Durum</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {yearFolders.map((folder, index) => {
                              const disposalYear = folder.disposalYear || (folder.fileYear + folder.retentionPeriod + 1);
                              const locationStr = getFullLocationString(folder.location);
                              return (
                                <tr key={folder.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                  <td className="px-2 py-1.5 text-gray-400">{index + 1}</td>
                                  <td className="px-2 py-1.5">
                                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                                      folder.category === 'Tıbbi' 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                    }`}>
                                      {folder.category}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{folder.departmentName || getDepartmentName(folder.departmentId)}</td>
                                  <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{folder.subject}</td>
                                  <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{folder.fileCode}</td>
                                  <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{folder.fileYear}</td>
                                  <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{folder.retentionPeriod} yıl</td>
                                  <td className="px-2 py-1.5">
                                    <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 text-xs">
                                      {folder.retentionCode}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                      disposalYear < new Date().getFullYear()
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                    }`}>
                                      {disposalYear}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{folder.clinic || '-'}</td>
                                  <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400 text-xs">{folder.specialInfo || '-'}</td>
                                  <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400 text-xs">{locationStr}</td>
                                  <td className="px-2 py-1.5">
                                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                                      folder.status === 'Çıkış' 
                                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                                        : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                    }`}>
                                      {folder.status || 'Arşivde'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* İmha Edilenler Tab */}
        {activeTab === 'disposed' && (
          <div className="space-y-2">
            {/* Actions Bar */}
            {disposedFolders.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-700 dark:text-green-400">{disposedFolders.length} klasör imha edildi</span>
                </div>
                <button
                  onClick={generateDisposedPdfReport}
                  disabled={isGenerating}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
                  PDF
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : disposedFolders.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Archive className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Henüz imha edilmiş klasör bulunmuyor.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 dark:bg-slate-700">
                    <tr>
                      <th className="px-2 py-2 text-left text-gray-600 dark:text-gray-300 w-8">#</th>
                      <th className="px-2 py-2 text-left text-gray-600 dark:text-gray-300">Kategori</th>
                      <th className="px-2 py-2 text-left text-gray-600 dark:text-gray-300">Departman</th>
                      <th className="px-2 py-2 text-left text-gray-600 dark:text-gray-300">Konu</th>
                      <th className="px-2 py-2 text-left text-gray-600 dark:text-gray-300">Dosya Kodu</th>
                      <th className="px-2 py-2 text-left text-gray-600 dark:text-gray-300">Dosya Yılı</th>
                      <th className="px-2 py-2 text-left text-gray-600 dark:text-gray-300">Saklama Süresi</th>
                      <th className="px-2 py-2 text-left text-gray-600 dark:text-gray-300">Saklama Kodu</th>
                      <th className="px-2 py-2 text-left text-gray-600 dark:text-gray-300">İmha Tarihi</th>
                      <th className="px-2 py-2 text-left text-gray-600 dark:text-gray-300">Lokasyon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {disposedFolders.map((disposal, index) => {
                      const folder = disposal.originalFolderData;
                      const locationStr = getFullLocationString(folder?.location);
                      return (
                        <tr key={disposal.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <td className="px-2 py-1.5 text-gray-400">{index + 1}</td>
                          <td className="px-2 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              folder?.category === 'Tıbbi' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                            }`}>
                              {folder?.category || '-'}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">
                            {folder?.departmentName || (folder?.departmentId ? getDepartmentName(folder.departmentId) : 'Bilinmiyor')}
                          </td>
                          <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{folder?.subject || '-'}</td>
                          <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{folder?.fileCode || '-'}</td>
                          <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{folder?.fileYear || '-'}</td>
                          <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{folder?.retentionPeriod ? `${folder.retentionPeriod} yıl` : '-'}</td>
                          <td className="px-2 py-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 text-xs">
                              {folder?.retentionCode || '-'}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-xs font-medium">
                              {new Date(disposal.disposalDate).toLocaleDateString('tr-TR')}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400 text-xs">{locationStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
