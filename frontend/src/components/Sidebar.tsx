import React from 'react';
import {
  LayoutDashboard,
  Folder,
  Search as SearchIcon,
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
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Tüm Klasörler', icon: Folder },
  { name: 'Yeni Klasör Ekle', icon: FolderPlus },
  { name: 'Arama', icon: SearchIcon },
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
  return (
    <aside
      className={`bg-gray-50 dark:bg-slate-800 flex flex-col shadow-lg ease-in-out ${
        isOpen ? 'w-64' : 'w-20'
      } h-screen sticky top-0 transition-width duration-300`}
    >
      <div
        className={`border-b border-gray-200 dark:border-slate-700 flex items-center shrink-0 h-[69px] p-4 transition-colors duration-300 ${
          isOpen ? 'justify-start' : 'justify-center'
        }`}
      >
        <ArchiveIcon size={28} className="text-archive-primary flex-shrink-0" />
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
              <li key={item.name} className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    if (item.name === 'Yeni Klasör Ekle') onAddNewFolder();
                    else setActivePage(item.name);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center w-full p-3 my-1 rounded-lg text-left transition-colors duration-300 ${
                    isActive
                      ? 'bg-archive-primary text-white shadow'
                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                  } ${!isOpen && 'justify-center'}`}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  <span
                    className={`ml-4 whitespace-nowrap transition-opacity ${
                      !isOpen ? 'opacity-0 hidden' : 'opacity-100'
                    }`}
                  >
                    {item.name}
                  </span>
                </button>

                {!isOpen && (
                  <div className="absolute left-full ml-3 px-2 py-1 text-sm font-medium text-white bg-gray-900 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap dark:bg-slate-900 dark:text-white pointer-events-none z-10">
                    {item.name}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-slate-700 text-center text-xs text-gray-500 dark:text-slate-400 transition-colors duration-300">
        <p className={`${!isOpen ? 'hidden' : 'whitespace-nowrap'}`}>
          Arşiv Yönetim Sistemi
        </p>
        <p className={`${!isOpen ? 'hidden' : ''}`}>© 2024</p>
      </div>
    </aside>
  );
};
