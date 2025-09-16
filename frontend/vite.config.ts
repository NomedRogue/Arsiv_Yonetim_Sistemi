import path from 'path';
import { defineConfig, loadEnv } from 'vite';
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
      react(),
      mode === 'analyze' && visualizer({
        filename: 'dist/bundle-analysis.html',
        open: false,
        gzipSize: true,
        brotliSize: true
      })
    ].filter(Boolean),

    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom']
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
      }
    },

    optimizeDeps: {
      include: ['react', 'react-dom']
    },

    esbuild: {
      target: 'es2020',
      logOverride: { 'this-is-undefined-in-esm': 'silent' }
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },

    define: {
      'process.env.API_BASE': JSON.stringify(
        mode === 'development' ? '/api' : 'http://localhost:3001'
      ),
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.NODE_ENV': JSON.stringify(mode)
    }
  };
});
