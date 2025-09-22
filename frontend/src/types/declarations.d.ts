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