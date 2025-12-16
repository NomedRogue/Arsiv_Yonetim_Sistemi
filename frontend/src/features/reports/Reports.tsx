import React, { useState, useEffect, useCallback } from "react";
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
  Infinity,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as api from "@/api";
import { toast } from "@/lib/toast";
import { useArchive } from "@/context/ArchiveContext";
import { DejaVuSansCondensedBase64 } from "@/assets/fonts/DejaVuSansCondensed";

// jsPDF'e Türkçe font ekle
const addTurkishFont = (doc: jsPDF): void => {
  doc.addFileToVFS("DejaVuSansCondensed.ttf", DejaVuSansCondensedBase64);
  doc.addFont("DejaVuSansCondensed.ttf", "DejaVu", "normal");
  doc.setFont("DejaVu");
};

interface DisposalYearData {
  year: number | string;
  count: number;
  label?: string;
  isOverdue?: boolean;
  isCurrentYear?: boolean;
}

// Use shared types
import { Folder, Disposal, FolderStatus } from "@/types";

// Extend Folder for report specific fields if any (disposalYear is calculated or comes from API)
interface ReportFolder extends Folder {
  disposalYear?: number;
}

interface DisposalRecord extends Disposal {
  // Override if necessary, but Disposal from types has originalFolderData as Folder
  // We can cast if needed
}

// Lokasyon bilgisini tam formatta döndür
const getFullLocationString = (location: any): string => {
  if (!location) return "-";
  if (location.storageType === "Kompakt") {
    return `Ünite ${location.unit || "-"} - ${location.face || "-"} - ${
      location.section || "-"
    }.Bölüm - ${location.shelf || "-"}.Raf`;
  } else {
    return `Stand ${location.stand || "-"} - ${location.shelf || "-"}.Raf`;
  }
};

export const Reports: React.FC = () => {
  const { settings, getDepartmentName } = useArchive();
  const [activeTab, setActiveTab] = useState<
    "overdue" | "toDispose" | "disposed" | "indefinite"
  >("overdue");
  const [disposalSchedule, setDisposalSchedule] = useState<DisposalYearData[]>(
    []
  );
  const [selectedYear, setSelectedYear] = useState<number | string | null>(
    null
  );
  const [yearFolders, setYearFolders] = useState<ReportFolder[]>([]);
  const [disposedFolders, setDisposedFolders] = useState<DisposalRecord[]>([]);
  const [indefiniteFolders, setIndefiniteFolders] = useState<ReportFolder[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedYear, setExpandedYear] = useState<number | string | null>(
    null
  );
  const [overdueFolders, setOverdueFolders] = useState<ReportFolder[]>([]);

  // İmha süresi geçen klasörleri yükle
  const loadOverdueFolders = useCallback(async () => {
    try {
      setIsLoading(true);
      const folders = await api.getDisposalYearFolders("overdue");
      setOverdueFolders(folders as unknown as ReportFolder[]);
    } catch (error: any) {
      toast.error("Süresi geçmiş klasörler yüklenemedi: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // İmha takvimini yükle
  const loadDisposalSchedule = useCallback(async () => {
    try {
      setIsLoading(true);
      const stats = await api.getDashboardStats("all", "last12");
      // Gecikmiş olanları filtrele (ayrı tab'da gösterilecek)
      const schedule = (stats.disposalSchedule || []).filter(
        (item: DisposalYearData) => !item.isOverdue
      );
      setDisposalSchedule(schedule);
    } catch (error: any) {
      toast.error("İmha takvimi yüklenemedi: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // İmha edilmiş klasörleri yükle
  const loadDisposedFolders = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getDisposals();
      setDisposedFolders(data as unknown as DisposalRecord[]);
    } catch (error: any) {
      if (error.message && !error.message.includes("Failed to fetch")) {
        toast.error("İmha edilmiş klasörler yüklenemedi: " + error.message);
      }
      setDisposedFolders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Süresiz saklanan klasörleri yükle
  const loadIndefiniteFolders = useCallback(async () => {
    try {
      setIsLoading(true);
      // Backend'de getDisposableFolders('indefinite') çağrısı yapıyoruz
      const folders = await api.getDisposableFolders("indefinite");
      setIndefiniteFolders(folders as unknown as ReportFolder[]);
    } catch (error: any) {
      toast.error("Süresiz saklanan klasörler yüklenemedi: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "overdue") {
      loadOverdueFolders();
    } else if (activeTab === "toDispose") {
      loadDisposalSchedule();
    } else if (activeTab === "indefinite") {
      loadIndefiniteFolders();
    } else {
      loadDisposedFolders();
    }
  }, [
    activeTab,
    loadOverdueFolders,
    loadDisposalSchedule,
    loadDisposedFolders,
    loadIndefiniteFolders,
  ]);

  // Belirli yıl için klasörleri yükle
  const loadYearFolders = async (year: number | string) => {
    try {
      setIsLoading(true);
      const yearParam = year === "Gecikmiş" ? "overdue" : year;
      const folders = await api.getDisposalYearFolders(yearParam);
      // API returns Folder[], we can cast to ReportFolder[] if we are sure
      setYearFolders(folders as unknown as ReportFolder[]);
      setSelectedYear(year);
      setExpandedYear(year);
    } catch (error: any) {
      toast.error("Klasörler yüklenemedi: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // PDF Rapor oluştur - İmha Edilecekler
  const generateToDisposePdfReport = async (
    year: number | string,
    folders: ReportFolder[],
    isOverdueTab: boolean = false
  ) => {
    if (folders.length === 0) {
      toast.info("Klasör bulunmuyor.");
      return;
    }

    setIsGenerating(true);

    try {
      const isOverdue =
        isOverdueTab || year === "Gecikmiş" || year === "overdue";
      const title = isOverdue
        ? "İmha Süresi Geçmiş Klasörler Raporu"
        : `${year} Yılı İmha Edilecek Klasörler Raporu`;
      const today = new Date().toLocaleDateString("tr-TR");
      const fileName = isOverdue
        ? `imha_suresi_gecmis_${Date.now()}.pdf`
        : `imha_edilecek_${year}_${Date.now()}.pdf`;

      // jsPDF ile PDF oluştur - A4 Yatay (Landscape)
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Türkçe font ekle
      addTurkishFont(doc);

      const pageWidth = 297; // A4 landscape width
      const pageHeight = 210; // A4 landscape height

      // Kurumsal Header - Üst çizgi
      doc.setFillColor(
        isOverdue ? 185 : 30,
        isOverdue ? 28 : 58,
        isOverdue ? 28 : 138
      );
      doc.rect(0, 0, pageWidth, 8, "F");

      // Başlık
      doc.setFontSize(14);
      doc.setTextColor(33, 33, 33);
      doc.text(title, pageWidth / 2, 18, { align: "center" });

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
      doc.text(
        `Toplam: ${folders.length} klasör`,
        pageWidth - marginRight,
        28,
        { align: "right" }
      );

      // Özet kutusu
      const tibbi = folders.filter((f) => f.category === "Tıbbi").length;
      const idari = folders.filter((f) => f.category === "İdari").length;
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(marginLeft, 31, contentWidth, 8, 2, 2, "F");
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text(
        `Toplam: ${folders.length}  |  Tıbbi: ${tibbi}  |  İdari: ${idari}`,
        pageWidth / 2,
        36,
        { align: "center" }
      );

      // Tablo verisi - A4 dikey için optimize edilmiş (UI ile aynı başlıklar)
      const tableData = folders.map((f, i) => {
        const locationStr = getFullLocationString(f.location);
        const retPeriod =
          typeof f.retentionPeriod === "number" ? f.retentionPeriod : 0;
        const disposalYear = f.disposalYear || f.fileYear + retPeriod + 1;
        return [
          (i + 1).toString(),
          f.category || "-",
          f.departmentName || "-",
          f.clinic || "-",
          f.fileYear?.toString() || "-",
          f.fileCount?.toString() || "-",
          f.fileCode || "-",
          f.subject || "-",
          f.specialInfo || "-",
          f.retentionPeriod === "B"
            ? "Sürekli (B)"
            : f.retentionPeriod
            ? `${f.retentionPeriod} Yıl`
            : "-",
          f.retentionCode || "-",
          locationStr,
          disposalYear.toString(),
          f.status || "Arşivde",
        ];
      });

      // Tablo - A4 dikey format, küçük font
      autoTable(doc, {
        startY: 42,
        head: [
          [
            "#",
            "Kategori",
            "Departman",
            "Klinik Bilgisi",
            "Dosya Yılı",
            "Dosya Sayısı",
            "Dosya Kodu",
            "Konu",
            "Özel Bilgi",
            "Saklama Süresi",
            "Saklama Kodu",
            "Lokasyon Bilgisi",
            "İmha Yılı",
            "Durum",
          ],
        ],
        body: tableData,
        styles: {
          font: "DejaVu",
          fontSize: 5,
          cellPadding: 1.5,
          overflow: "linebreak",
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
          minCellHeight: 4,
          halign: "center",
        },
        headStyles: {
          fillColor: isOverdue ? [185, 28, 28] : [30, 58, 138],
          textColor: 255,
          fontStyle: "normal",
          fontSize: 5,
          halign: "center",
          minCellHeight: 5,
          overflow: "visible",
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
          0: { cellWidth: "auto", minCellWidth: 5, halign: "center" },
          1: { cellWidth: "auto", minCellWidth: 10 },
          2: { cellWidth: "auto", minCellWidth: 15 },
          3: { cellWidth: "auto", minCellWidth: 10 },
          4: { cellWidth: "auto", minCellWidth: 10, halign: "center" },
          5: { cellWidth: "auto", minCellWidth: 8, halign: "center" },
          6: { cellWidth: "auto", minCellWidth: 12 },
          7: { cellWidth: "auto", minCellWidth: 18 },
          8: { cellWidth: "auto", minCellWidth: 15 },
          9: { cellWidth: "auto", minCellWidth: 12, halign: "center" },
          10: { cellWidth: "auto", minCellWidth: 10, halign: "center" },
          11: { cellWidth: "auto", minCellWidth: 25, overflow: "ellipsize" },
          12: { cellWidth: "auto", minCellWidth: 10, halign: "center" },
          13: { cellWidth: "auto", minCellWidth: 10, halign: "center" },
        },
        margin: { left: 6, right: 6 },
        tableWidth: "auto",
        didDrawPage: (data) => {
          // Her sayfada header tekrarla
          if (data.pageNumber > 1) {
            doc.setFillColor(
              isOverdue ? 185 : 30,
              isOverdue ? 28 : 58,
              isOverdue ? 28 : 138
            );
            doc.rect(0, 0, 210, 5, "F");
          }
          // Footer
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(7);
          doc.setTextColor(130, 130, 130);
          doc.text("Arşiv Yönetim Sistemi", 15, 287);
          doc.text(`Sayfa ${data.pageNumber} / ${pageCount}`, 195, 287, {
            align: "right",
          });

          // Alt çizgi
          doc.setDrawColor(
            isOverdue ? 185 : 30,
            isOverdue ? 28 : 58,
            isOverdue ? 28 : 138
          );
          doc.setLineWidth(1);
          doc.line(0, 292, 210, 292);
        },
      });

      // PDF'i base64'e çevir ve Electron API ile kaydet
      const pdfBase64 = doc.output("datauristring").split(",")[1];

      if (window.electronAPI?.savePdfToDownloads) {
        const result = await window.electronAPI.savePdfToDownloads(
          fileName,
          pdfBase64
        );
        if (result.success) {
          toast.success("PDF raporu başarıyla oluşturuldu");
        } else {
          toast.error("PDF kaydedilemedi: " + result.error);
        }
      } else {
        doc.save(fileName);
        toast.success("PDF raporu başarıyla oluşturuldu");
      }
    } catch (error: any) {
      toast.error("Rapor oluşturulamadı: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // PDF Rapor oluştur - İmha Edilenler
  const generateDisposedPdfReport = async () => {
    if (disposedFolders.length === 0) {
      toast.info("İmha edilmiş klasör bulunmuyor.");
      return;
    }

    setIsGenerating(true);

    try {
      const title = "İmha Edilmiş Klasörler Raporu";
      const today = new Date().toLocaleDateString("tr-TR");
      const fileName = `imha_edilmis_${Date.now()}.pdf`;

      // jsPDF ile PDF oluştur - Portrait A4
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Türkçe font ekle
      addTurkishFont(doc);

      const pageWidth = 297; // A4 landscape width
      const pageHeight = 210; // A4 landscape height

      // Kurumsal Header - Üst çizgi
      doc.setFillColor(22, 128, 58);
      doc.rect(0, 0, pageWidth, 8, "F");

      // Başlık
      doc.setFontSize(14);
      doc.setTextColor(33, 33, 33);
      doc.text(title, pageWidth / 2, 18, { align: "center" });

      // Alt çizgi - tablo ile aynı margin
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(6, 22, 204, 22);

      // Meta bilgi - tablo ile aynı margin (6mm)
      const marginLeft = 6;
      const marginRight = 6;

      const contentWidth = pageWidth - marginLeft - marginRight;

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Rapor Tarihi: ${today}`, marginLeft, 28);
      doc.text(
        `Toplam: ${disposedFolders.length} klasör`,
        pageWidth - marginRight,
        28,
        { align: "right" }
      );

      // Özet kutusu
      const tibbi = disposedFolders.filter(
        (d) => d.originalFolderData?.category === "Tıbbi"
      ).length;
      const idari = disposedFolders.filter(
        (d) => d.originalFolderData?.category === "İdari"
      ).length;
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(marginLeft, 31, contentWidth, 8, 2, 2, "F");
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);
      doc.text(
        `Toplam: ${disposedFolders.length}  |  Tıbbi: ${tibbi}  |  İdari: ${idari}`,
        pageWidth / 2,
        36,
        { align: "center" }
      );

      // Tablo verisi - Portrait için optimize (UI ile aynı başlıklar)
      const tableData = disposedFolders.map((d, i) => {
        const f = d.originalFolderData;
        const locationStr = getFullLocationString(f?.location);
        return [
          (i + 1).toString(),
          f?.category || "-",
          f?.departmentName || "Bilinmiyor",
          f?.clinic || "-",
          f?.fileYear?.toString() || "-",
          f?.fileCount?.toString() || "-",
          f?.fileCode || "-",
          f?.subject || "-",
          f?.specialInfo || "-",
          f?.retentionPeriod === "B"
            ? "Sürekli (B)"
            : f?.retentionPeriod
            ? `${f.retentionPeriod} Yıl (${f.retentionCode || ""})`
            : "-",
          f?.retentionCode || "-",
          locationStr,
          new Date(d.disposalDate).toLocaleDateString("tr-TR"),
          "İmha Edildi",
        ];
      });

      // Tablo - Portrait A4 için optimize edilmiş, küçük font (UI ile aynı başlıklar)
      autoTable(doc, {
        startY: 42,
        head: [
          [
            "#",
            "Kategori",
            "Departman",
            "Klinik Bilgisi",
            "Dosya Yılı",
            "Dosya Sayısı",
            "Dosya Kodu",
            "Konu",
            "Özel Bilgi",
            "Saklama Süresi",
            "Saklama Kodu",
            "Lokasyon Bilgisi",
            "İmha Yılı",
            "Durum",
          ],
        ],
        body: tableData,
        styles: {
          font: "DejaVu",
          fontSize: 5,
          cellPadding: 1.5,
          overflow: "linebreak",
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
          minCellHeight: 4,
          halign: "center",
        },
        headStyles: {
          fillColor: [22, 128, 58],
          textColor: 255,
          fontStyle: "normal",
          fontSize: 5,
          halign: "center",
          minCellHeight: 5,
          overflow: "visible",
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
          0: { cellWidth: "auto", minCellWidth: 5, halign: "center" },
          1: { cellWidth: "auto", minCellWidth: 10 },
          2: { cellWidth: "auto", minCellWidth: 15 },
          3: { cellWidth: "auto", minCellWidth: 10 },
          4: { cellWidth: "auto", minCellWidth: 10, halign: "center" },
          5: { cellWidth: "auto", minCellWidth: 8, halign: "center" },
          6: { cellWidth: "auto", minCellWidth: 12 },
          7: { cellWidth: "auto", minCellWidth: 18 },
          8: { cellWidth: "auto", minCellWidth: 15 },
          9: { cellWidth: "auto", minCellWidth: 12, halign: "center" },
          10: { cellWidth: "auto", minCellWidth: 10, halign: "center" },
          11: { cellWidth: "auto", minCellWidth: 25, overflow: "ellipsize" },
          12: { cellWidth: "auto", minCellWidth: 10, halign: "center" },
          13: { cellWidth: "auto", minCellWidth: 10, halign: "center" },
        },
        margin: { left: 6, right: 6 },
        tableWidth: "auto",
        didDrawPage: (data) => {
          // Her sayfada header tekrarla
          if (data.pageNumber > 1) {
            doc.setFillColor(22, 128, 58);
            doc.rect(0, 0, 210, 5, "F");
          }
          // Footer
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(7);
          doc.setTextColor(130, 130, 130);
          doc.text("Arşiv Yönetim Sistemi", 15, 287);
          doc.text(`Sayfa ${data.pageNumber} / ${pageCount}`, 195, 287, {
            align: "right",
          });

          // Alt çizgi
          doc.setDrawColor(22, 128, 58);
          doc.setLineWidth(1);
          doc.line(0, 292, 210, 292);
        },
      });

      // PDF'i base64'e çevir ve Electron API ile kaydet
      const pdfBase64 = doc.output("datauristring").split(",")[1];

      if (window.electronAPI?.savePdfToDownloads) {
        const result = await window.electronAPI.savePdfToDownloads(
          fileName,
          pdfBase64
        );
        if (result.success) {
          toast.success("PDF raporu başarıyla oluşturuldu");
        } else {
          toast.error("PDF kaydedilemedi: " + result.error);
        }
      } else {
        doc.save(fileName);
        toast.success("PDF raporu başarıyla oluşturuldu");
      }
    } catch (error: any) {
      toast.error("Rapor oluşturulamadı: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // PDF Rapor oluştur - Süresiz Saklananlar
  const generateIndefinitePdfReport = async () => {
    if (indefiniteFolders.length === 0) {
      toast.info("Klasör bulunmuyor.");
      return;
    }

    setIsGenerating(true);

    try {
      const title = "Süresiz Saklanan Klasörler Raporu";
      const today = new Date().toLocaleDateString("tr-TR");
      const fileName = `suresiz_saklanan_${Date.now()}.pdf`;

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      addTurkishFont(doc);

      const pageWidth = 297; // A4 landscape width
      const pageHeight = 210; // A4 landscape height

      // Header
      doc.setFillColor(79, 70, 229); // Indigo
      doc.rect(0, 0, pageWidth, 8, "F");

      doc.setFontSize(14);
      doc.setTextColor(33, 33, 33);
      doc.text(title, pageWidth / 2, 18, { align: "center" });

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(6, 22, pageWidth - 6, 22);

      const marginLeft = 6;
      const marginRight = 6;
      const contentWidth = pageWidth - marginLeft - marginRight;

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Rapor Tarihi: ${today}`, marginLeft, 28);
      doc.text(
        `Toplam: ${indefiniteFolders.length} klasör`,
        pageWidth - marginRight,
        28,
        { align: "right" }
      );

      // Tablo verisi
      const tableData = indefiniteFolders.map((f, i) => {
        const locationStr = getFullLocationString(f.location);
        return [
          (i + 1).toString(),
          f.category || "-",
          getDepartmentName(f.departmentId),
          f.clinic || "-",
          f.fileYear?.toString() || "-",
          f.fileCount?.toString() || "-",
          f.fileCode || "-",
          f.subject || "-",
          f.specialInfo || "-",
          f.retentionPeriod || "-",
          f.retentionCode || "-",
          locationStr,
          "Kurumunda Saklanır",
          f.status || "Arşivde",
        ];
      });

      autoTable(doc, {
        startY: 32,
        head: [
          [
            "#",
            "Kategori",
            "Departman",
            "Klinik Bilgisi",
            "Dosya Yılı",
            "Dosya Sayısı",
            "Dosya Kodu",
            "Konu",
            "Özel Bilgi",
            "Saklama Süresi",
            "Saklama Kodu",
            "Lokasyon Bilgisi",
            "İmha Yılı", // Indefinite report
            "Durum",
          ],
        ],
        body: tableData,
        styles: {
          font: "DejaVu",
          fontSize: 5,
          cellPadding: 1.5,
          overflow: "linebreak",
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
          minCellHeight: 4,
          halign: "center",
        },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: "normal",
          fontSize: 5,
          halign: "center",
          minCellHeight: 5,
          overflow: "visible",
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        // Column styles for better fit
        columnStyles: {
          0: { cellWidth: "auto", minCellWidth: 5, halign: "center" },
          1: { cellWidth: "auto", minCellWidth: 10 },
          2: { cellWidth: "auto", minCellWidth: 15 },
          3: { cellWidth: "auto", minCellWidth: 10 },
          4: { cellWidth: "auto", minCellWidth: 10, halign: "center" },
          5: { cellWidth: "auto", minCellWidth: 8, halign: "center" },
          6: { cellWidth: "auto", minCellWidth: 12 },
          7: { cellWidth: "auto", minCellWidth: 18 },
          8: { cellWidth: "auto", minCellWidth: 15 },
          9: { cellWidth: "auto", minCellWidth: 12, halign: "center" },
          10: { cellWidth: "auto", minCellWidth: 10, halign: "center" },
          11: { cellWidth: "auto", minCellWidth: 25, overflow: "ellipsize" },
          12: { cellWidth: "auto", minCellWidth: 10, halign: "center" },
          13: { cellWidth: "auto", minCellWidth: 10, halign: "center" },
        },
        margin: { left: 6, right: 6 },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            doc.setFillColor(79, 70, 229);
            doc.rect(0, 0, 210, 5, "F");
          }
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(7);
          doc.setTextColor(130, 130, 130);
          doc.text("Arşiv Yönetim Sistemi", 15, 287);
          doc.text(`Sayfa ${data.pageNumber} / ${pageCount}`, 195, 287, {
            align: "right",
          });
          doc.line(0, 292, 210, 292);
        },
      });

      const pdfBase64 = doc.output("datauristring").split(",")[1];
      if (window.electronAPI?.savePdfToDownloads) {
        await window.electronAPI.savePdfToDownloads(fileName, pdfBase64);
        toast.success("PDF raporu başarıyla oluşturuldu");
      } else {
        doc.save(fileName);
        toast.success("PDF raporu başarıyla oluşturuldu");
      }
    } catch (error: any) {
      toast.error("Rapor oluşturulamadı: " + error.message);
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
    if (item.isOverdue)
      return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    if (item.isCurrentYear)
      return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
    return "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700";
  };

  return (
    <div className="h-full flex flex-col overflow-hidden p-4 xl:p-6">
      {/* Compact Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 xl:px-4 xl:py-2 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 rounded-t-lg">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">
          İmha raporları
        </h2>
        <button
          onClick={() => {
            if (activeTab === "overdue") loadOverdueFolders();
            else if (activeTab === "toDispose") loadDisposalSchedule();
            else loadDisposedFolders();
          }}
          disabled={isLoading}
          className="flex items-center gap-1 px-2 py-1 text-[10px] xl:text-xs bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          Yenile
        </button>
      </div>

      {/* Tab Navigation - Sıra: İmha Süresi Geçenler > İmha Edilecekler > İmha Edilenler */}
      <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
        <button
          onClick={() => setActiveTab("overdue")}
          className={`flex items-center gap-1.5 px-3 py-1.5 xl:px-4 xl:py-2 text-[10px] xl:text-xs font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "overdue"
              ? "border-red-500 text-red-600 dark:text-red-400 bg-white dark:bg-slate-800"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          İmha Süresi Geçenler
        </button>
        <button
          onClick={() => setActiveTab("toDispose")}
          className={`flex items-center gap-1.5 px-3 py-1.5 xl:px-4 xl:py-2 text-[10px] xl:text-xs font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "toDispose"
              ? "border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-slate-800"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          İmha Edilecekler
        </button>
        <button
          onClick={() => setActiveTab("indefinite")}
          className={`flex items-center gap-1.5 px-3 py-1.5 xl:px-4 xl:py-2 text-[10px] xl:text-xs font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "indefinite"
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <Infinity className="w-3.5 h-3.5" />
          Süresiz Saklananlar
        </button>
        <button
          onClick={() => setActiveTab("disposed")}
          className={`flex items-center gap-1.5 px-3 py-1.5 xl:px-4 xl:py-2 text-[10px] xl:text-xs font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "disposed"
              ? "border-green-500 text-green-600 dark:text-green-400 bg-white dark:bg-slate-800"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          İmha Edilenler
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-2 xl:p-3 bg-white dark:bg-slate-800 rounded-b-lg">
        {/* İmha Süresi Geçenler Tab */}
        {activeTab === "overdue" && (
          <div className="space-y-2">
            {/* Actions Bar */}
            {overdueFolders.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-[10px] xl:text-xs text-red-700 dark:text-red-400 font-medium">
                    {overdueFolders.length} klasörün imha süresi geçmiş!
                  </span>
                </div>
                <button
                  onClick={() =>
                    generateToDisposePdfReport("overdue", overdueFolders, true)
                  }
                  disabled={isGenerating}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] xl:text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <FileDown className="w-3 h-3" />
                  )}
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
                <p className="text-xs xl:text-sm">
                  İmha süresi geçmiş klasör bulunmuyor.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-red-200 dark:border-red-800">
                <table className="w-full text-[10px] xl:text-xs">
                  <thead className="bg-red-100 dark:bg-red-900/30">
                    <tr>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-2 text-center text-red-700 dark:text-red-300 w-8">
                        #
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-2 text-center text-red-700 dark:text-red-300">
                        Kategori
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-2 text-center text-red-700 dark:text-red-300">
                        Departman
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-2 text-center text-red-700 dark:text-red-300">
                        Klinik
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-2 text-center text-red-700 dark:text-red-300">
                        Dosya Yılı
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-2 text-center text-red-700 dark:text-red-300">
                        Dosya Sayısı
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-2 text-center text-red-700 dark:text-red-300">
                        Dosya Kodu
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-2 text-center text-red-700 dark:text-red-300">
                        Konu
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-2 text-center text-red-700 dark:text-red-300">
                        Özel Bilgi
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-2 text-center text-red-700 dark:text-red-300">
                        Saklama Süresi
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-2 text-center text-red-700 dark:text-red-300">
                        Saklama Kodu
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-2 text-center text-red-700 dark:text-red-300">
                        Lokasyon
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-2 text-center text-red-700 dark:text-red-300">
                        İmha Yılı
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-2 text-center text-red-700 dark:text-red-300">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 dark:divide-red-900/30 bg-white dark:bg-slate-800">
                    {overdueFolders.map((folder, index) => {
                      const retPeriod = Number(folder.retentionPeriod) || 0;
                      const disposalYear =
                        folder.disposalYear || folder.fileYear + retPeriod + 1;
                      const locationStr = getFullLocationString(
                        folder.location
                      );
                      return (
                        <tr
                          key={folder.id}
                          className="hover:bg-red-50 dark:hover:bg-red-900/10"
                        >
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-400">
                            {index + 1}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] xl:text-xs ${
                                folder.category === "Tıbbi"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                              }`}
                            >
                              {folder.category}
                            </span>
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                            {folder.departmentName ||
                              getDepartmentName(folder.departmentId)}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-400">
                            {folder.clinic || "-"}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                            {folder.fileYear}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                            {folder.fileCount}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-400">
                            {folder.fileCode}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                            {folder.subject}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-400">
                            {folder.specialInfo || "-"}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                            {folder.retentionPeriod === "B"
                              ? "Süresiz"
                              : folder.retentionPeriod}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 text-[10px] xl:text-xs">
                              {folder.retentionCode}
                            </span>
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-400">
                            {locationStr}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] xl:text-xs font-bold ${
                                folder.retentionCode === "B" ||
                                folder.retentionPeriod === "B"
                                  ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                              }`}
                            >
                              {folder.retentionCode === "B" ||
                              folder.retentionPeriod === "B"
                                ? "Kurumunda Saklanır"
                                : disposalYear}
                            </span>
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] xl:text-xs ${
                                folder.status === FolderStatus.Cikista
                                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300"
                                  : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                              }`}
                            >
                              {folder.status || "Arşivde"}
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

        {/* Süresiz Saklananlar Tab */}
        {activeTab === "indefinite" && (
          <div className="space-y-2">
            {/* Actions Bar */}
            {indefiniteFolders.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-2">
                  <Infinity className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] xl:text-xs text-indigo-700 dark:text-indigo-400 font-medium">
                    {indefiniteFolders.length} klasör süresiz olarak saklanıyor
                  </span>
                </div>
                <button
                  onClick={generateIndefinitePdfReport}
                  disabled={isGenerating}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] xl:text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <FileDown className="w-3 h-3" />
                  )}
                  PDF
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : indefiniteFolders.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Infinity className="w-10 h-10 mx-auto mb-2 opacity-50 text-indigo-500" />
                <p className="text-xs xl:text-sm">
                  Süresiz saklanan klasör bulunmuyor.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-indigo-200 dark:border-indigo-800">
                <table className="w-full text-[10px] xl:text-xs">
                  <thead className="bg-indigo-100 dark:bg-indigo-900/30">
                    <tr>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-indigo-700 dark:text-indigo-300 w-8">
                        #
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-indigo-700 dark:text-indigo-300">
                        Kategori
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-indigo-700 dark:text-indigo-300">
                        Departman
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-indigo-700 dark:text-indigo-300">
                        Klinik
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-indigo-700 dark:text-indigo-300">
                        Dosya Yılı
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-indigo-700 dark:text-indigo-300">
                        Dosya Sayısı
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-indigo-700 dark:text-indigo-300">
                        Dosya Kodu
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-indigo-700 dark:text-indigo-300">
                        Konu
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-indigo-700 dark:text-indigo-300">
                        Özel Bilgi
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-indigo-700 dark:text-indigo-300">
                        Saklama Süresi
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-indigo-700 dark:text-indigo-300">
                        Saklama Kodu
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-indigo-700 dark:text-indigo-300">
                        Lokasyon
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-indigo-700 dark:text-indigo-300">
                        İmha Yılı
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-indigo-700 dark:text-indigo-300">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-100 dark:divide-indigo-900/30 bg-white dark:bg-slate-800">
                    {indefiniteFolders.map((folder, index) => {
                      const locationStr = getFullLocationString(
                        folder.location
                      );
                      return (
                        <tr
                          key={folder.id}
                          className="hover:bg-indigo-50 dark:hover:bg-indigo-900/10"
                        >
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-400">
                            {index + 1}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] xl:text-xs ${
                                folder.category === "Tıbbi"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                              }`}
                            >
                              {folder.category}
                            </span>
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                            {folder.departmentName ||
                              getDepartmentName(folder.departmentId)}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-400">
                            {folder.clinic || "-"}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                            {folder.fileYear}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                            {folder.fileCount}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-400">
                            {folder.fileCode}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                            {folder.subject}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-400">
                            {folder.specialInfo || "-"}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                            {folder.retentionPeriod}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                            {folder.retentionCode}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-400">
                            {locationStr}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[10px] xl:text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 font-medium">
                              Kurumunda Saklanır
                            </span>
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] xl:text-xs ${
                                folder.status === FolderStatus.Cikista
                                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300"
                                  : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                              }`}
                            >
                              {folder.status || "Arşivde"}
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
        {activeTab === "toDispose" && (
          <div className="space-y-2">
            {isLoading && disposalSchedule.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : disposalSchedule.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs xl:text-sm">
                  İmha takvimi verisi bulunamadı.
                </p>
              </div>
            ) : (
              disposalSchedule.map((item) => (
                <div
                  key={item.year}
                  className={`border rounded-lg overflow-hidden ${getYearStyle(
                    item
                  )}`}
                >
                  {/* Year Header */}
                  <button
                    onClick={() =>
                      item.count > 0 && toggleYear(item.label || item.year)
                    }
                    disabled={item.count === 0}
                    className={`w-full flex items-center justify-between p-2 text-left ${
                      item.count > 0
                        ? "hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer"
                        : "opacity-60"
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
                      <span
                        className={`font-semibold text-xs xl:text-sm ${
                          item.isOverdue
                            ? "text-red-700 dark:text-red-400"
                            : item.isCurrentYear
                            ? "text-orange-700 dark:text-orange-400"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {item.label || item.year}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] xl:text-xs font-bold ${
                          item.isOverdue
                            ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                            : item.isCurrentYear
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                            : "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300"
                        }`}
                      >
                        {item.count} klasör
                      </span>
                      {item.count > 0 &&
                        (expandedYear === (item.label || item.year) ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ))}
                    </div>
                  </button>

                  {/* Expanded Folders */}
                  {expandedYear === (item.label || item.year) &&
                    yearFolders.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-slate-700">
                        {/* Actions Bar */}
                        <div className="p-2 bg-gray-50 dark:bg-slate-800/50 flex items-center justify-between border-b border-gray-200 dark:border-slate-700">
                          <span className="text-[10px] xl:text-xs text-gray-500">
                            {yearFolders.length} klasör
                          </span>
                          <button
                            onClick={() =>
                              generateToDisposePdfReport(
                                item.label || item.year,
                                yearFolders,
                                false
                              )
                            }
                            disabled={isGenerating}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] xl:text-xs bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors disabled:opacity-50"
                          >
                            {isGenerating ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <FileDown className="w-3 h-3" />
                            )}
                            PDF
                          </button>
                        </div>

                        {/* Folder Table */}
                        <div className="overflow-x-auto max-h-72">
                          <table className="w-full text-[10px] xl:text-xs">
                            <thead className="bg-gray-100 dark:bg-slate-700 sticky top-0">
                              <tr>
                                <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300 w-8">
                                  #
                                </th>
                                <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                                  Kategori
                                </th>
                                <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                                  Departman
                                </th>
                                <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                                  Klinik
                                </th>
                                <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                                  Dosya Yılı
                                </th>
                                <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                                  Dosya Sayısı
                                </th>
                                <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                                  Dosya Kodu
                                </th>
                                <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                                  Konu
                                </th>
                                <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                                  Özel Bilgi
                                </th>
                                <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                                  Saklama Süresi
                                </th>
                                <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                                  Saklama Kodu
                                </th>
                                <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                                  Lokasyon
                                </th>
                                <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                                  İmha Yılı
                                </th>
                                <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                                  Durum
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                              {yearFolders.map((folder, index) => {
                                const retPeriod =
                                  typeof folder.retentionPeriod === "number"
                                    ? folder.retentionPeriod
                                    : 0;
                                const disposalYear =
                                  folder.disposalYear ||
                                  folder.fileYear + retPeriod + 1;
                                const locationStr = getFullLocationString(
                                  folder.location
                                );
                                return (
                                  <tr
                                    key={folder.id}
                                    className="hover:bg-gray-50 dark:hover:bg-slate-700/30"
                                  >
                                    <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-400">
                                      {index + 1}
                                    </td>
                                    <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] xl:text-xs ${
                                          folder.category === "Tıbbi"
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                        }`}
                                      >
                                        {folder.category}
                                      </span>
                                    </td>
                                    <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                                      {folder.departmentName ||
                                        getDepartmentName(folder.departmentId)}
                                    </td>
                                    <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-400">
                                      {folder.clinic || "-"}
                                    </td>
                                    <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                                      {folder.fileYear}
                                    </td>
                                    <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                                      {folder.fileCount}
                                    </td>
                                    <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-400">
                                      {folder.fileCode}
                                    </td>
                                    <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                                      {folder.subject}
                                    </td>
                                    <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-400">
                                      {folder.specialInfo || "-"}
                                    </td>
                                    <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                                      {folder.retentionPeriod}
                                    </td>
                                    <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center">
                                      <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 text-[10px] xl:text-xs">
                                        {folder.retentionCode}
                                      </span>
                                    </td>
                                    <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-400">
                                      {locationStr}
                                    </td>
                                    <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] xl:text-xs font-bold ${
                                          disposalYear <
                                          new Date().getFullYear()
                                            ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                                        }`}
                                      >
                                        {disposalYear}
                                      </span>
                                    </td>
                                    <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] xl:text-xs ${
                                          folder.status === FolderStatus.Cikista
                                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300"
                                            : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                        }`}
                                      >
                                        {folder.status || "Arşivde"}
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
        {activeTab === "disposed" && (
          <div className="space-y-2">
            {/* Actions Bar */}
            {disposedFolders.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-[10px] xl:text-xs text-green-700 dark:text-green-400">
                    {disposedFolders.length} klasör imha edildi
                  </span>
                </div>
                <button
                  onClick={generateDisposedPdfReport}
                  disabled={isGenerating}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] xl:text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <FileDown className="w-3 h-3" />
                  )}
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
                <p className="text-xs xl:text-sm">
                  Henüz imha edilmiş klasör bulunmuyor.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
                <table className="w-full text-[10px] xl:text-xs">
                  <thead className="bg-gray-100 dark:bg-slate-700">
                    <tr>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300 w-8">
                        #
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                        Kategori
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                        Departman
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                        Klinik
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                        Dosya Yılı
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                        Dosya Sayısı
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                        Dosya Kodu
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                        Konu
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                        Özel Bilgi
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                        Saklama Süresi
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                        Saklama Kodu
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                        Lokasyon
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                        İmha Tarihi
                      </th>
                      <th className="px-1.5 py-1.5 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-300">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {disposedFolders.map((disposal, index) => {
                      const folder = disposal.originalFolderData;
                      const locationStr = getFullLocationString(
                        folder?.location
                      );
                      return (
                        <tr
                          key={disposal.id}
                          className="hover:bg-gray-50 dark:hover:bg-slate-700/30"
                        >
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-400">
                            {index + 1}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] xl:text-xs ${
                                folder?.category === "Tıbbi"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                              }`}
                            >
                              {folder?.category || "-"}
                            </span>
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                            {folder?.departmentName ||
                              (folder?.departmentId
                                ? getDepartmentName(folder.departmentId)
                                : "Bilinmiyor")}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-400">
                            {folder?.clinic || "-"}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                            {folder?.fileYear || "-"}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                            {folder?.fileCount || "-"}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-400">
                            {folder?.fileCode || "-"}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                            {folder?.subject || "-"}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-400">
                            {folder?.specialInfo || "-"}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-700 dark:text-gray-300">
                            {folder?.retentionPeriod
                              ? `${folder.retentionPeriod}`
                              : "-"}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 text-[10px] xl:text-xs">
                              {folder?.retentionCode || "-"}
                            </span>
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center text-gray-600 dark:text-gray-400 text-[10px] xl:text-xs">
                            {locationStr}
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-[10px] xl:text-xs font-medium">
                              {new Date(
                                disposal.disposalDate
                              ).toLocaleDateString("tr-TR")}
                            </span>
                          </td>
                          <td className="px-1.5 py-1 xl:px-2 xl:py-1.5 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] xl:text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300`}
                            >
                              İmha Edildi
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
      </div>
    </div>
  );
};

export default Reports;
