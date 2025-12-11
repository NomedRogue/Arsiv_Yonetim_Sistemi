import path from 'path';
import { defineConfig, loadEnv, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { visualizer } from 'rollup-plugin-visualizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    base: './',
    plugins: [
      react({
        jsxRuntime: 'automatic',
        // Production build için özel yapılandırma
        ...(mode === 'production' && {
          jsxImportSource: 'react'
        })
      }),
      // Health check middleware for wait-on compatibility
      {
        name: 'health-check',
        configureServer(server: any) {
          server.middlewares.use('/health', (req: any, res: any, next: any) => {
            if (req.method === 'HEAD' || req.method === 'GET') {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'ok' }));
            } else {
              next();
            }
          });
        }
      },
      // Bundle analyzer - only in analyze mode
      ...(mode === 'analyze' ? [visualizer({
        filename: 'dist/bundle-analysis.html',
        open: false,
        gzipSize: true,
        brotliSize: true
      }) as PluginOption] : [])
    ],

    server: {
      port: 5173,
      host: '127.0.0.1',
      middlewareMode: false,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    },

    build: {
      chunkSizeWarningLimit: 1500, // Font base64 verisi nedeniyle limiti 1.5MB'a yükselt
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            charts: ['recharts'],
            icons: ['lucide-react']
          }
        }
      },
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        },
        mangle: {
          safari10: true
        }
      },
      cssMinify: true,
      cssCodeSplit: true
    },

    optimizeDeps: {
      include: ['react', 'react-dom']
    },

    esbuild: {
      target: 'es2020'
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },

    define: {
      // Production'da her zaman localhost:3001 kullan (Electron için)
      'process.env.API_BASE': JSON.stringify('http://localhost:3001'),
      'process.env.NODE_ENV': JSON.stringify(mode === 'development' ? 'development' : 'production'),
      // React development özelliklerini devre dışı bırak
      '__DEV__': mode === 'development',
      'process.env.REACT_APP_NODE_ENV': JSON.stringify('production')
    }
  };
});
