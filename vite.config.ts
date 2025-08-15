import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'better-sqlite3', 'bcrypt']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      external: ['better-sqlite3', 'bcrypt']
    }
  },
  optimizeDeps: {
    exclude: ['better-sqlite3', 'bcrypt']
  },
  server: {
    proxy: {
      // Proxy BlockCypher API calls
      '/api/blockcypher': {
        target: 'https://api.blockcypher.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/blockcypher/, ''),
        headers: {
          'User-Agent': 'MultiWalletChecker/1.0'
        }
      },
      // Proxy Blockchain.info API calls
      '/api/blockchain': {
        target: 'https://blockchain.info',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/blockchain/, ''),
        headers: {
          'User-Agent': 'MultiWalletChecker/1.0'
        }
      },
      // Proxy Blockstream API calls
      '/api/blockstream': {
        target: 'https://blockstream.info',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/blockstream/, ''),
        headers: {
          'User-Agent': 'MultiWalletChecker/1.0'
        }
      },
      // Proxy CoinGecko API calls
      '/api/coingecko': {
        target: 'https://api.coingecko.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coingecko/, ''),
        headers: {
          'User-Agent': 'MultiWalletChecker/1.0'
        }
      }
    }
  }
});