import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/socket.io': {
        target: 'https://show-game.onrender.com',
        ws: true,
      },
    },
  },
});
