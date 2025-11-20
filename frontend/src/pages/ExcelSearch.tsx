import React, { useState } from 'react';
import { Search as SearchIcon, FileSpreadsheet, Loader2, MapPin, Calendar, Hash } from 'lucide-react';
import { toast } from '@/lib/toast';
import { openFileWithSystem } from '@/lib/fileUtils';
import { Folder } from '../types';
import { handleApiError } from '@/lib/apiErrorHandler';

interface ExcelSearchResult {
  matchedDosyaNo?: string[];
  matchedHastaAdi?: string[];
  totalRecords?: number;
}

interface SearchResult extends Folder {
  excelPath?: string;
  matchedDosyaNo?: string[];
  matchedHastaAdi?: string[];
  totalRecords?: number;
}

export default function ExcelSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Lütfen arama terimi girin');
      return;
    }

    try {
      setIsLoading(true);
      const baseUrl = import.meta.env.DEV ? '/api' : 'http://localhost:3001/api';
      const response = await fetch(`${baseUrl}/excel-search?q=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error('Arama başarısız');
      }

      const data = await response.json();
      setResults(Array.isArray(data) ? data : []);
      
      if (data.length === 0) {
        toast.success('Sonuç bulunamadı');
      } else {
        toast.success(`${data.length} sonuç bulundu`);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Arama sırasında hata oluştu');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Excel Hasta Kayıt Arama
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Yüklediğiniz Excel dosyalarında hasta dosya numarası ve hasta adı arayın
          </p>
        </div>

        {/* Arama Kutusu */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Hasta dosya numarası veya hasta adı soyadı..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg dark:bg-slate-700 dark:border-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading || !searchTerm.trim()}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Aranıyor...
                </>
              ) : (
                <>
                  <SearchIcon className="h-5 w-5" />
                  Ara
                </>
              )}
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
            <strong>İpucu:</strong> Excel dosyalarındaki <strong>SAYI</strong> (Hasta Dosya No) ve <strong>AÇIKLAMALAR</strong> (Hasta Adı Soyadı) kolonlarında arama yapılır.
          </div>
        </div>

        {/* Sonuçlar */}
        {results.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {results.length} Sonuç Bulundu
            </h2>

            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Başlık ve Kategori Badge */}
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2.5 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                            {result.category}
                          </span>
                          <span className={`px-2.5 py-1 text-xs font-medium rounded ${
                            result.status === 'Arşivde' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : result.status === 'Çıkışta'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}>
                            {result.status}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {result.departmentName ? `${result.departmentName} - ${result.subject}` : result.subject}
                        </h3>
                      </div>

                      {/* Ana Bilgiler - Liste Format */}
                      <div className="space-y-1 text-sm mb-3">
                        <div className="text-gray-700 dark:text-gray-300">
                          <strong>Dosya Kodu:</strong> {result.fileCode}
                        </div>
                        <div className="text-gray-700 dark:text-gray-300">
                          <strong>Dosya Yılı:</strong> {result.fileYear}  
                          <span className="ml-4"><strong>Dosya Sayısı:</strong> {result.fileCount}</span>  
                          <span className="ml-4"><strong>Saklama:</strong> {result.retentionPeriod}-{result.retentionCode}</span>
                        </div>
                        {result.clinic && (
                          <div className="text-gray-700 dark:text-gray-300">
                            <strong>Klinik:</strong> {result.clinic}
                          </div>
                        )}
                        <div className="text-gray-700 dark:text-gray-300">
                          <strong>Klasör Tipi:</strong> {result.folderType}
                        </div>
                        {result.specialInfo && (
                          <div className="text-gray-700 dark:text-gray-300">
                            <strong>Özel Bilgi:</strong> {result.specialInfo}
                          </div>
                        )}
                        <div className="text-gray-700 dark:text-gray-300">
                          <strong>Lokasyon:</strong> {result.location.storageType === 'Kompakt' ? 'Ünite ' : ''}{result.location.unit} - {result.location.face} - {result.location.section}.Bölüm - {result.location.shelf}.Raf{result.location.stand ? ` - ${result.location.stand}.Stand` : ''}
                        </div>
                      </div>

                      {/* Eşleşen Kayıtlar */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                        {(result.matchedDosyaNo && result.matchedDosyaNo.length > 0) && (
                          <div className="mb-2">
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                              Eşleşen Hasta Dosya Numaraları:
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-400">
                              {result.matchedDosyaNo.slice(0, 5).join(', ')}
                              {result.matchedDosyaNo.length > 5 && ` ... (+${result.matchedDosyaNo.length - 5} daha)`}
                            </p>
                          </div>
                        )}
                        {(result.matchedHastaAdi && result.matchedHastaAdi.length > 0) && (
                          <div>
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                              Eşleşen Hasta Adları:
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-400">
                              {result.matchedHastaAdi.slice(0, 5).join(', ')}
                              {result.matchedHastaAdi.length > 5 && ` ... (+${result.matchedHastaAdi.length - 5} daha)`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Excel Aç Butonu */}
                    {result.excelPath && (
                      <button
                        onClick={() => openFileWithSystem(result.excelPath!, 'excel')}
                        className="ml-4 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <FileSpreadsheet className="h-5 w-5" />
                        Excel Aç
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Boş Durum */}
        {!isLoading && results.length === 0 && searchTerm && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-12 text-center">
            <SearchIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Sonuç Bulunamadı
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              "{searchTerm}" için hiçbir kayıt bulunamadı
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
