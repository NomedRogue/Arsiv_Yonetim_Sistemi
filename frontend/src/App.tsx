import React, { useState, Suspense } from 'react';
import { ArchiveProvider } from '@/context/ArchiveProvider';
import { useTheme, initTheme } from '@/hooks/useTheme';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { ToastHost } from '@/components/Toast';
import { EnhancedErrorBoundary } from '@/components/EnhancedErrorBoundary';
import { Category } from './types';
import '@/lib/errorLogger'; // Initialize global error handlers

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('@/pages/Dashboard').then(module => ({ default: module.Dashboard })));
const FolderList = React.lazy(() => import('@/pages/FolderList').then(module => ({ default: module.FolderList })));
const Search = React.lazy(() => import('@/pages/Search').then(module => ({ default: module.Search })));
const CheckoutReturn = React.lazy(() => import('@/pages/CheckoutReturn').then(module => ({ default: module.CheckoutReturn })));
const Disposal = React.lazy(() => import('@/pages/Disposal').then(module => ({ default: module.Disposal })));
const Settings = React.lazy(() => import('@/pages/Settings').then(module => ({ default: module.Settings })));
const FolderForm = React.lazy(() => import('@/pages/FolderForm').then(module => ({ default: module.FolderForm })));

// Start theme management before React renders
initTheme();

const App: React.FC = () => {
  const [theme, toggleTheme] = useTheme();
  const [activePage, setActivePage] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);

  // Dashboard kartlarından gelen yönlendirmeler için state'ler
  const [initialSearchCriteria, setInitialSearchCriteria] = useState<{ category?: Category } | null>(null);
  const [initialDisposalTab, setInitialDisposalTab] = useState<'disposable' | 'disposed' | undefined>();

  const handleEditFolder = (folderId: number) => {
    setEditingFolderId(folderId);
    setActivePage('Yeni Klasör Ekle');
  };

  const handleAddNewFolder = () => {
    setEditingFolderId(null);
    setActivePage('Yeni Klasör Ekle');
  };

  const handleCardNavigation = (page: string, params?: { category?: Category, tab?: 'disposable' | 'disposed' }) => {
    // Navigasyon öncesi filtreleri ayarla veya temizle
    setInitialSearchCriteria(page === 'Arama' && params?.category ? { category: params.category } : null);
    setInitialDisposalTab(page === 'İmha' ? params?.tab : undefined);
    setActivePage(page);
  };

  // Loading component for lazy loaded pages
  const PageLoader = () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      <span className="ml-3 text-gray-600">Sayfa yükleniyor...</span>
    </div>
  );

  const renderPage = () => {
    const pageContent = (() => {
      switch (activePage) {
        case 'Dashboard':
          return <Dashboard onNavigate={handleCardNavigation} />;
        case 'Tüm Klasörler':
          return <FolderList onEditFolder={handleEditFolder} />;
        case 'Yeni Klasör Ekle':
          return (
            <FolderForm
              editingFolderId={editingFolderId}
              setEditingFolderId={setEditingFolderId}
              setActivePage={setActivePage}
            />
          );
        case 'Arama':
          return <Search onEditFolder={handleEditFolder} initialCriteria={initialSearchCriteria} />;
        case 'Çıkış/İade Takip':
          return <CheckoutReturn />;
        case 'İmha':
          return <Disposal initialTab={initialDisposalTab} />;
        case 'Ayarlar':
          return <Settings />;
        default:
          return <Dashboard onNavigate={handleCardNavigation} />;
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
        <div className="h-screen flex bg-archive-light-bg dark:bg-archive-dark-bg text-slate-800 dark:text-slate-200">
          <Sidebar
            activePage={activePage}
            setActivePage={setActivePage}
            isOpen={isSidebarOpen}
            onAddNewFolder={handleAddNewFolder}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header
              pageTitle={
                activePage === 'Yeni Klasör Ekle'
                  ? editingFolderId
                    ? 'Klasör Düzenle'
                    : 'Yeni Klasör Ekle'
                  : activePage
              }
              theme={theme}
              toggleTheme={toggleTheme}
              toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-archive-light-bg dark:bg-archive-dark-bg text-slate-800 dark:text-slate-200">
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

export default App;