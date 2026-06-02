import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// const API_URL = import.meta.env.BACKEND_API_URL;


export default defineConfig({
  
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://vehicleguard-kkd6.onrender.com" ||"http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});

