import React, { useState, Suspense, useCallback, useEffect } from 'react';
import { ArchiveProvider } from '@/context/ArchiveProvider';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { ToastHost } from '@/components/Toast';
import { EnhancedErrorBoundary } from '@/components/EnhancedErrorBoundary';
import { Category } from './types';
import '@/lib/errorLogger'; // Initialize global error handlers

// Lazy load pages for better performance
const Anasayfa = React.lazy(() => import('@/features/dashboard').then(m => ({ default: m.Dashboard })));
const Arsiv = React.lazy(() => import('@/features/folders').then(m => ({ default: m.FolderList })));
const ExcelSearch = React.lazy(() => import('@/features/excel-search').then(m => ({ default: m.ExcelSearch })));
const CheckoutReturn = React.lazy(() => import('@/features/checkout').then(m => ({ default: m.CheckoutReturn })));
const Disposal = React.lazy(() => import('@/features/disposal').then(m => ({ default: m.Disposal })));
const Reports = React.lazy(() => import('@/features/reports').then(m => ({ default: m.Reports })));
const Settings = React.lazy(() => import('@/features/settings'));
const FolderForm = React.lazy(() => import('@/features/folders').then(m => ({ default: m.FolderForm })));

const AppContent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { isBackendReady, isLoading, error } = useBackendStatus();
  const [activePage, setActivePage] = useState('Anasayfa');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);

  // Dashboard kartlarından gelen yönlendirmeler için state'ler
  const [initialDisposalTab, setInitialDisposalTab] = useState<'disposable' | 'disposed' | undefined>();
  const [initialDisposalFilter, setInitialDisposalFilter] = useState<'thisYear' | 'nextYear' | 'overdue' | undefined>();

  // Backend hazır değilse loading/error göster
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <h2 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-200 transition-colors duration-300">
            Arşiv Yönetim Sistemi Başlatılıyor...
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400 transition-colors duration-300">
            Backend server başlatılıyor, lütfen bekleyin...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
        <div className="text-center max-w-md">
          <div className="bg-red-100 dark:bg-red-900 rounded-full h-16 w-16 mx-auto flex items-center justify-center transition-colors duration-300">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-red-800 dark:text-red-200 transition-colors duration-300">
            Backend Başlatma Hatası
          </h2>
          <p className="mt-2 text-red-600 dark:text-red-400 transition-colors duration-300">
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
          >
            Yeniden Dene
          </button>
        </div>
      </div>
    );
  }

  const handleEditFolder = (folderId: number) => {
    setEditingFolderId(folderId);
    setActivePage('Klasör Ekle');
  };

  const handleAddNewFolder = () => {
    setEditingFolderId(null);
    setActivePage('Klasör Ekle');
  };

  const handleCardNavigation = (page: string, params?: { category?: Category, tab?: 'disposable' | 'disposed', filter?: 'thisYear' | 'nextYear' | 'overdue' }) => {
    // Navigasyon öncesi filtreleri ayarla veya temizle
    setInitialDisposalTab(page === 'İmha' ? params?.tab : undefined);
    setInitialDisposalFilter(page === 'İmha' ? params?.filter : undefined);
    setActivePage(page);
  };

  // Loading component for lazy loaded pages
  const PageLoader = () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      <span className="ml-3 text-gray-600 dark:text-gray-400 transition-colors duration-300">Sayfa yükleniyor...</span>
    </div>
  );

  const renderPage = () => {
    const pageContent = (() => {
      switch (activePage) {
        case 'Anasayfa':
          return <Anasayfa onNavigate={handleCardNavigation} />;
        case 'Arşiv':
          return <Arsiv onEditFolder={handleEditFolder} />;
        case 'Klasör Ekle':
          return (
            <FolderForm
              editingFolderId={editingFolderId}
              setEditingFolderId={setEditingFolderId}
              setActivePage={setActivePage}
            />
          );
        case 'Arama':
          return <ExcelSearch />;
        case 'Çıkış/İade Takip':
          return <CheckoutReturn />;
        case 'İmha':
          return <Disposal initialTab={initialDisposalTab} initialFilter={initialDisposalFilter} />;
        case 'Raporlar':
          return <Reports />;
        case 'Ayarlar':
          return <Settings />;
        default:
          return <Anasayfa onNavigate={handleCardNavigation} />;
      }
    })();

    return (
      <Suspense fallback={<PageLoader />}>
        {pageContent}
      </Suspense>
    );
  };

  return (
    <EnhancedErrorBoundary>
      <ArchiveProvider>
        <div className="h-screen flex bg-archive-light-bg dark:bg-archive-dark-bg text-slate-800 dark:text-slate-200 transition-colors duration-300">
          <Sidebar
            activePage={activePage}
            setActivePage={setActivePage}
            isOpen={isSidebarOpen}
            onAddNewFolder={handleAddNewFolder}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header
              pageTitle={
                activePage === 'Klasör Ekle'
                  ? editingFolderId
                    ? 'Klasör Düzenle'
                    : 'Klasör Ekle'
                  : activePage
              }
              theme={theme}
              toggleTheme={toggleTheme}
              toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-archive-light-bg dark:bg-archive-dark-bg text-slate-800 dark:text-slate-200 transition-colors duration-300">
              <EnhancedErrorBoundary>
                {renderPage()}
              </EnhancedErrorBoundary>
            </main>
          </div>
        </div>

        {/* global toast host */}
        <ToastHost />
      </ArchiveProvider>
    </EnhancedErrorBoundary>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;