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
  openFile: (filePath: string) => Promise<void>;
  savePdfToDownloads: (fileName: string, base64Data: string) => Promise<string>;
  updater: {
    checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string }>;
    downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
    installUpdate: () => void;
    getVersion: () => Promise<string>;
    onUpdateStatus: (callback: (data: any) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};