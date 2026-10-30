import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// const API_URL = import.meta.env.BACKEND_API_URL;


export default defineConfig({
  
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        // target: "https://maasheetla.netlify.app" ||"http://localhost:5000",
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});

