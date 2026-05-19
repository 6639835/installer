import { defineConfig } from 'vite';
import path from 'path';
import ViteYaml from '@modyfi/vite-plugin-yaml';

const root = __dirname;

export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  resolve: {
    alias: {
      simplebar: path.resolve(root, './node_modules/simplebar-react/'),
      common: path.resolve(root, './src/common/'),
      renderer: path.resolve(root, './src/renderer/'),
      '@flybywiresim/fragmenter': path.resolve(root, './src/renderer/platform/fragmenterCompat.ts'),
      fs: path.resolve(root, './src/renderer/platform/node/fs.ts'),
      os: path.resolve(root, './src/renderer/platform/node/os.ts'),
      path: path.resolve(root, './src/renderer/platform/node/path.ts'),
    },
  },
  plugins: [ViteYaml()],
});
