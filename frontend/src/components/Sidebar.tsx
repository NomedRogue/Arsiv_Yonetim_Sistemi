import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  Folder,
  FileSpreadsheet,
  FileOutput,
  Trash2,
  Settings,
  Archive as ArchiveIcon,
  FolderPlus,
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  isOpen: boolean;
  onAddNewFolder: () => void;
}

const navItems = [
  { name: 'Anasayfa', icon: LayoutDashboard },
  { name: 'Arşiv', icon: Folder },
  { name: 'Yeni Klasör Ekle', icon: FolderPlus },
  { name: 'Excel Arama', icon: FileSpreadsheet },
  { name: 'Çıkış/İade Takip', icon: FileOutput },
  { name: 'İmha', icon: Trash2 },
  { name: 'Ayarlar', icon: Settings },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  isOpen,
  onAddNewFolder,
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  
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
  
  return (
    <aside
      className={`bg-gray-50 dark:bg-slate-800 flex flex-col shadow-lg ease-in-out ${
        isOpen ? 'w-64' : 'w-20'
      } h-screen sticky top-0 transition-width duration-300 z-40`}
    >
      <div
        className={`layout-header border-b border-gray-200 dark:border-slate-700 px-4 transition-colors duration-300 ${
          isOpen ? 'justify-start' : 'justify-center'
        }`}
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
            const isActive = activePage === item.name;
            return (
              <li key={item.name} className="relative group isolate">
                <button
                  type="button"
                  onClick={() => {
                    if (item.name === 'Yeni Klasör Ekle') onAddNewFolder();
                    else setActivePage(item.name);
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

      <div className="p-4 border-t border-gray-200 dark:border-slate-700 text-center text-xs text-gray-500 dark:text-slate-400 transition-colors duration-300">
        <p className={`${!isOpen ? 'hidden' : 'whitespace-nowrap'}`}>
          Arşiv Yönetim Sistemi
        </p>
        <p className={`${!isOpen ? 'hidden' : ''}`}>© 2025</p>
      </div>
    </aside>
  );
};
