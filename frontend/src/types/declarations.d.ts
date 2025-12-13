declare module 'rollup-plugin-visualizer' {
  import { Plugin } from 'rollup';
  
  interface VisualizerOptions {
    filename?: string;
    open?: boolean;
    gzipSize?: boolean;
    brotliSize?: boolean;
    template?: 'treemap' | 'sunburst' | 'network';
  }
  
  export function visualizer(options?: VisualizerOptions): Plugin;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.css' {
  const content: string;
  export default content;
}

// Electron API declarations
interface ElectronAPI {
  openFolderDialog: () => Promise<string | null>;
  openFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  savePdfToDownloads: (fileName: string, base64Data: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  
  // Window controls for custom title bar
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    resizeForApp: () => Promise<void>;
  };
  
  updater: {
    checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string; isDev?: boolean; is404?: boolean }>;
    downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
    installUpdate: () => void;
    getVersion: () => Promise<string>;
    onUpdateStatus: (callback: (data: any) => void) => () => void;
  };
  
  paths?: {
    userData: string;
  };

  db?: {
    close: () => Promise<{ success: boolean; error?: string }>;
    reconnect: () => Promise<{ success: boolean; error?: string }>;
    saveGithubToken: (token: string) => Promise<boolean>;
  };
  
  signalAppReady: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};