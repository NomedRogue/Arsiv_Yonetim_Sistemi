import React, { useState, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArchiveProvider } from '@/context/ArchiveProvider';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { TitleBar } from '@/components/TitleBar';
import { ToastHost } from '@/components/Toast';
import { EnhancedErrorBoundary } from '@/components/EnhancedErrorBoundary';

import { Category } from './types';
import '@/lib/errorLogger'; // Initialize global error handlers
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Login } from '@/features/auth/Login';

// Lazy load pages for better performance
const Anasayfa = React.lazy(() => import('@/features/dashboard').then(m => ({ default: m.Dashboard })));
const Arsiv = React.lazy(() => import('@/features/folders').then(m => ({ default: m.FolderList })));
const ExcelSearch = React.lazy(() => import('@/features/excel-search').then(m => ({ default: m.ExcelSearch })));
const CheckoutReturn = React.lazy(() => import('@/features/checkout').then(m => ({ default: m.CheckoutReturn })));
const Disposal = React.lazy(() => import('@/features/disposal').then(m => ({ default: m.Disposal })));
const Reports = React.lazy(() => import('@/features/reports').then(m => ({ default: m.Reports })));
const Settings = React.lazy(() => import('@/features/settings'));
const FolderForm = React.lazy(() => import('@/features/folders').then(m => ({ default: m.FolderForm })));

// Helper to bridge params to FolderForm
const FolderFormWrapper = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const editingFolderId = id || null; // ID artık string, parseInt gereksiz
    
    return (
        <FolderForm 
            editingFolderId={editingFolderId} 
            setEditingFolderId={() => {}} // No-op, strictly controlled by URL now
            setActivePage={() => navigate('/folders')} // Redirect to list on cancel/success
        />
    );
};

// Separate component to use useAuth hook
const AuthWrapper: React.FC = () => {
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const { isBackendReady, isLoading: isBackendLoading, error } = useBackendStatus();
    const { theme, toggleTheme } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    // Dashboard kartlarından gelen yönlendirmeler için state'ler (Keep these for now, or pass via location state)
    // We can pass these as props to Disposal component if we use a wrapper, or Disposal can read from location.state
    const [initialDisposalTab, setInitialDisposalTab] = useState<'disposable' | 'disposed' | undefined>();
    const [initialDisposalFilter, setInitialDisposalFilter] = useState<'thisYear' | 'nextYear' | 'overdue' | undefined>();

    React.useEffect(() => {
        if (!isAuthLoading && !isBackendLoading) {
            // Signal Electron that we are ready to show the UI
            // Use double rAF to ensure paint is effectively done
            // React hazır, sinyali gönder.
            setTimeout(() => {
                if ((window.electronAPI as any)?.signalAppReady) {
                     (window.electronAPI as any).signalAppReady();
                }
            }, 300);
        }
    }, [isAuthLoading, isBackendLoading]);

    if (isAuthLoading || isBackendLoading) {
        // While loading, we render nothing (or a transparent div) because the Splash Screen is covering everything.
        // We do NOT want to show a second loading spinner.
        return null; 
    }

    if (!isAuthenticated) {
        return (
            <>
                <Login />
                <ToastHost />
            </>
        );
    }

    if (error) {
       // ... Error UI remains the same ...
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

    const handleEditFolder = (folderId: string) => {
        // Navigate to edit route
        navigate(`/folders/edit/${folderId}`);
    };

    const handleAddNewFolder = () => {
        navigate('/folders/new');
    };

    const handleCardNavigation = (page: string, params?: { category?: Category, tab?: 'disposable' | 'disposed', filter?: 'thisYear' | 'nextYear' | 'overdue' }) => {
        // Map page names to routes
        // This is legacy support for Dashboard callback
        if (page === 'İmha') {
             // Pass state via location state or keep local state if Disposal reads it as props.
             // Best to use URL search params for filters so they are shareable.
             // keeping local state for now as Disposal might not support URL params yet.
             setInitialDisposalTab(params?.tab);
             setInitialDisposalFilter(params?.filter);
             navigate('/disposal');
        } else if (page === 'Arşiv') {
             const query = new URLSearchParams();
             if (params?.category) query.set('category', params.category);
             navigate(`/folders?${query.toString()}`);
        } else {
             // Default mapping
             const map: Record<string, string> = {
                 'Anasayfa': '/',
                 'Arşiv': '/folders',
                 'Klasör Ekle': '/folders/new',
                 'Arama': '/search',
                 'Dosya Talep': '/checkouts',
                 'İmha': '/disposal',
                 'Raporlar': '/reports',
                 'Ayarlar': '/settings'
             };
             if (map[page]) navigate(map[page]);
        }
    };

    // Helper to get Page Title from location
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Anasayfa';
        if (path === '/folders') return 'Arşiv';
        if (path === '/folders/new') return 'Klasör Ekle';
        if (path.startsWith('/folders/edit')) return 'Klasör Düzenle';
        if (path === '/search') return 'Arama';
        if (path === '/checkouts') return 'Dosya Talep';
        if (path === '/disposal') return 'İmha';
        if (path === '/reports') return 'Raporlar';
        if (path === '/settings') return 'Ayarlar';
        return 'Arşiv Yönetim Sistemi';
    };

    return (
      <ArchiveProvider>
        <div className="h-screen flex flex-col bg-archive-light-bg dark:bg-archive-dark-bg text-slate-800 dark:text-slate-200 transition-colors duration-300">
          <TitleBar title={getPageTitle()} theme={theme} />
          <div className="flex flex-1 overflow-hidden">
          <Sidebar
            isOpen={isSidebarOpen}
            onAddNewFolder={handleAddNewFolder}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header
              pageTitle={getPageTitle()}
              theme={theme}
              toggleTheme={toggleTheme}
              toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-archive-light-bg dark:bg-archive-dark-bg text-slate-800 dark:text-slate-200 transition-colors duration-300">
              <EnhancedErrorBoundary>
                <Suspense fallback={
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                        <span className="ml-3 text-gray-600 dark:text-gray-400 transition-colors duration-300">Sayfa yükleniyor...</span>
                    </div>
                }>
                    <Routes>
                        <Route path="/" element={<Anasayfa onNavigate={handleCardNavigation} />} />
                        <Route path="/folders" element={<Arsiv onEditFolder={handleEditFolder} />} />
                        <Route path="/folders/new" element={
                            <FolderForm 
                                editingFolderId={null} 
                                setEditingFolderId={() => {}} 
                                setActivePage={() => navigate('/folders')} 
                            />
                        } />
                         <Route path="/folders/edit/:id" element={
                             // We will need a wrapper or update FolderForm to handle ID from params.
                             // For now, let's wrap it to extract ID.
                             /* FolderForm expects numeric ID or null. Route param is string. */
                             <FolderFormWrapper />
                        } />
                        <Route path="/search" element={<ExcelSearch />} />
                        <Route path="/checkouts" element={<CheckoutReturn />} />
                        <Route path="/disposal" element={<Disposal initialTab={initialDisposalTab} initialFilter={initialDisposalFilter} />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
              </EnhancedErrorBoundary>
            </main>
          </div>
          </div> {/* Close flex container */}
        </div>


        {/* global toast host */}
        <ToastHost />
        
        {/* Auto-update notification */}

      </ArchiveProvider>

  );
};

const AppContent: React.FC = () => {
    return (
    <EnhancedErrorBoundary>
      <AuthProvider>
       <AuthWrapper />
      </AuthProvider>
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