import React, { useState, useTransition } from 'react';
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
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onAddNewFolder: () => void;
}

const navItems = [
  { name: 'Anasayfa', path: '/', icon: LayoutDashboard },
  { name: 'Arşiv', path: '/folders', icon: Folder },
  { name: 'Klasör Ekle', path: '/folders/new', icon: FolderPlus }, 
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
  const [isPending, startTransition] = useTransition();
  
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
    if (path === '/folders' && location.pathname === '/folders/new') return false;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <aside
      className={cn(
        "flex flex-col shadow-xl ease-spring transition-all duration-300 sticky top-0 z-40",
         // Glassmorphism effect
        "bg-gray-50/90 dark:bg-slate-800/90 backdrop-blur-md border-r border-white/20 dark:border-slate-700/50",
        isOpen ? 'w-64' : 'w-20'
      )}
      style={{ height: 'calc(100vh - 40px)' }} 
    >
      <div
        className={cn(
            "layout-header border-b border-gray-200/50 dark:border-slate-700/50 px-4 transition-all duration-300 flex items-center h-14",
            isOpen ? 'justify-start' : 'justify-center'
        )}
      >
        <ArchiveIcon className="text-archive-primary flex-shrink-0 filter drop-shadow-sm" style={{ width: '1.75em', height: '1.75em' }} />
        {isOpen && (
          <h1 className="text-md font-bold ml-3 text-slate-800 dark:text-white transition-colors duration-300 truncate">
            Arşiv Yönetim Sistemi
          </h1>
        )}
      </div>

      <nav className="flex-1 p-2 pt-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600">
        <ul>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.path);
            
            return (
              <li key={item.name} className="relative group isolate mb-1">
                <button
                  type="button"
                  onClick={() => {
                    startTransition(() => {
                        if (item.name === 'Klasör Ekle') {
                            onAddNewFolder(); 
                            navigate(item.path);
                        } else {
                            navigate(item.path);
                        }
                    });
                  }}
                  onMouseEnter={(e) => handleMouseEnter(item.name, e)}
                  onMouseLeave={handleMouseLeave}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.name}
                  className={cn(
                    "flex items-center w-full p-3 rounded-xl text-left transition-all duration-200 group-hover:scale-[1.02]",
                    isActive
                      ? "bg-archive-primary text-white shadow-md shadow-archive-primary/20 ring-1 ring-white/20"
                      : "text-gray-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-white hover:shadow-sm"
                    , !isOpen && 'justify-center', isPending && 'opacity-70 cursor-wait'
                  )}
                >
                  <Icon className={cn("flex-shrink-0 transition-transform duration-300", isActive && "scale-110")} style={{ width: '1.25em', height: '1.25em' }} />
                  
                  <span
                    className={cn(
                        "ml-4 whitespace-nowrap transition-all duration-300 origin-left",
                        !isOpen ? 'opacity-0 w-0 hidden scale-0' : 'opacity-100 w-auto scale-100'
                    )}
                  >
                    {item.name}
                  </span>
                  
                  {/* Active Indicator Dot for collapsed mode */}
                  {!isOpen && isActive && (
                      <span className="absolute right-2 top-2 w-2 h-2 rounded-full bg-archive-accent animate-pulse" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Tooltip Portal */}
      {!isOpen && hoveredItem && tooltipPosition && createPortal(
        <div
          className="fixed px-3 py-2 text-sm font-medium text-white bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-2xl whitespace-nowrap dark:bg-slate-900/95 border border-slate-700/50 pointer-events-none animate-in fade-in zoom-in-95 duration-200 z-[100000]"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translateY(-50%)',
          }}
        >
          {hoveredItem}
        </div>,
        document.body
      )}

      <div className="p-4 border-t border-gray-200/50 dark:border-slate-700/50 font-medium transition-colors duration-300 bg-gray-50/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <button
            onClick={() => {
                logout();
                startTransition(() => {
                    navigate('/');
                });
            }}
            aria-label="Çıkış Yap"
            className={cn(
                "flex items-center w-full p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 hover:shadow-sm",
                !isOpen && 'justify-center'
            )}
        >
             <LogOut className="flex-shrink-0" style={{ width: '1.25em', height: '1.25em' }} />
             <span className={cn("ml-4 whitespace-nowrap transition-opacity", !isOpen ? 'opacity-0 hidden' : 'opacity-100')}>
                Çıkış Yap
             </span>
        </button>
        <div className={cn("mt-2 text-center text-xs text-gray-500 dark:text-slate-400 transition-all duration-300", !isOpen && 'hidden opacity-0 h-0')}>
             <p className="leading-tight">Arşiv Yönetim Sistemi</p>
             <p className="leading-tight opacity-70">© 2025</p>
        </div>
      </div>
    </aside>
  );
};
