import { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';
import './TitleBar.css';

interface TitleBarProps {
  title?: string;
  showIcon?: boolean;
  theme?: 'light' | 'dark';
}

export function TitleBar({ title = 'Arşiv Yönetim Sistemi', showIcon = true, theme = 'light' }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    checkMaximized();
  }, []);

  const checkMaximized = async () => {
    if (window.electronAPI?.window) {
      const maximized = await window.electronAPI.window.isMaximized();
      setIsMaximized(maximized);
    }
  };

  const handleMinimize = () => {
    window.electronAPI?.window.minimize();
  };

  const handleMaximize = async () => {
    await window.electronAPI?.window.maximize();
    checkMaximized();
  };

  const handleClose = () => {
    window.electronAPI?.window.close();
  };

  return (
    <div className={`title-bar ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="title-bar-drag-region">
        {showIcon && (
          <div className="title-bar-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="9 22 9 12 15 12 15 22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        <div className="title-bar-title">{title}</div>
      </div>
      
      <div className="title-bar-controls">
        <button 
          className="title-bar-button minimize" 
          onClick={handleMinimize}
          aria-label="Minimize"
        >
          <Minus size={16} />
        </button>
        <button 
          className="title-bar-button maximize" 
          onClick={handleMaximize}
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? <Square size={14} /> : <Maximize2 size={14} />}
        </button>
        <button 
          className="title-bar-button close" 
          onClick={handleClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
