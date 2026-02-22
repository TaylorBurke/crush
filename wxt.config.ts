import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Crush',
    description: 'AI-powered task intelligence for your new tab -- crush the day.',
    version: '0.1.0',
    permissions: ['storage'],
  },
});
