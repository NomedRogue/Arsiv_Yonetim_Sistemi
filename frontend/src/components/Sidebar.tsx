import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Folder,
  FileSpreadsheet,
  FileOutput,
  Settings,
  Archive as ArchiveIcon,
  FolderPlus,
  FileText,
  Trash2,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onAddNewFolder: () => void;
}

const navItems = [
  { name: 'Anasayfa', path: '/', icon: LayoutDashboard },
  { name: 'Arşiv', path: '/folders', icon: Folder },
  { name: 'Klasör Ekle', path: '/folders/new', icon: FolderPlus }, // Special handler might override this
  { name: 'Arama', path: '/search', icon: FileSpreadsheet },
  { name: 'Dosya Talep', path: '/checkouts', icon: FileOutput },
  { name: 'İmha', path: '/disposal', icon: Trash2 },
  { name: 'Raporlar', path: '/reports', icon: FileText },
  { name: 'Ayarlar', path: '/settings', icon: Settings },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onAddNewFolder,
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  
  const handleMouseEnter = (itemName: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      const rect = event.currentTarget.getBoundingClientRect();
      setHoveredItem(itemName);
      setTooltipPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    }
  };
  
  const handleMouseLeave = () => {
    setHoveredItem(null);
    setTooltipPosition(null);
  };
  
  // Helper to determine active state
  const isItemActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    // Prevent 'Arşiv' from being active when 'Klasör Ekle' is selected
    if (path === '/folders' && location.pathname === '/folders/new') return false;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <aside
      className={`bg-gray-50 dark:bg-slate-800 flex flex-col shadow-lg ease-in-out ${
        isOpen ? 'w-64' : 'w-20'
      } sticky top-0 transition-width duration-300 z-40`}
      style={{ height: 'calc(100vh - 40px)' }} // Subtract title bar height
    >
      <div
        className={`layout-header border-b border-gray-200 dark:border-slate-700 px-4 transition-colors duration-300 ${
          isOpen ? 'justify-start' : 'justify-center'
        }`}
        style={{ height: '56px' }} // Same as header height
      >
        <ArchiveIcon className="text-archive-primary flex-shrink-0" style={{ width: '1.75em', height: '1.75em' }} />
        {isOpen && (
          <h1 className="text-md font-bold ml-3 text-slate-800 dark:text-white transition-colors duration-300 truncate">
            Arşiv Yönetim Sistemi
          </h1>
        )}
      </div>

      <nav className="flex-1 p-2 pt-4">
        <ul>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.path);
            
            // Special case for 'Klasör Ekle' if we are in 'edit' mode or explicitly adding new
            // But usually the path /folders/new identifies it.
            // However, the original code had a callback onAddNewFolder. 
            // We'll keep using navigation for consistency, but the callback might be needed for resetting state in parent.

            return (
              <li key={item.name} className="relative group isolate">
                <button
                  type="button"
                  onClick={() => {
                    if (item.name === 'Klasör Ekle') {
                        onAddNewFolder(); // Keep this to reset editingFolderId in parent if needed
                        navigate(item.path);
                    } else {
                        navigate(item.path);
                    }
                  }}
                  onMouseEnter={(e) => handleMouseEnter(item.name, e)}
                  onMouseLeave={handleMouseLeave}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center w-full p-3 my-1 rounded-lg text-left transition-colors duration-300 ${
                    isActive
                      ? 'bg-archive-primary text-white shadow'
                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                  } ${!isOpen && 'justify-center'}`}
                >
                  <Icon className="flex-shrink-0" style={{ width: '1.25em', height: '1.25em' }} />
                  <span
                    className={`ml-4 whitespace-nowrap transition-opacity ${
                      !isOpen ? 'opacity-0 hidden' : 'opacity-100'
                    }`}
                  >
                    {item.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Tooltip Portal - Body'e render edilir, en üst katmanda görünür */}
      {!isOpen && hoveredItem && tooltipPosition && createPortal(
        <div
          className="fixed px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md shadow-2xl whitespace-nowrap dark:bg-slate-900 dark:text-white pointer-events-none animate-in fade-in duration-200"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translateY(-50%)',
            zIndex: 99999,
          }}
        >
          {hoveredItem}
        </div>,
        document.body
      )}

      <div className="p-4 border-t border-gray-200 dark:border-slate-700 font-medium transition-colors duration-300">
        <button
            onClick={() => {
                logout();
                navigate('/');
            }}
            className={`flex items-center w-full p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-300 ${!isOpen && 'justify-center'}`}
        >
             <LogOut className="flex-shrink-0" style={{ width: '1.25em', height: '1.25em' }} />
             <span className={`ml-4 whitespace-nowrap transition-opacity ${!isOpen ? 'opacity-0 hidden' : 'opacity-100'}`}>
                Çıkış Yap
             </span>
        </button>
        <div className={`mt-2 text-center text-xs text-gray-500 dark:text-slate-400 ${!isOpen && 'hidden'}`}>
             <p className="leading-tight">Arşiv Yönetim Sistemi</p>
             <p className="leading-tight">© 2025</p>
        </div>
      </div>
    </aside>
  );
};
