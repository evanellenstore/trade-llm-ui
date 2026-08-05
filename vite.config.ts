import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/broker': {
        target: 'http://localhost:7090',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
