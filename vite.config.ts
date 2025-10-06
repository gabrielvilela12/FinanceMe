import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import vercel from "vite-plugin-vercel"; // 1. Importe o plugin

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // 2. Adicione o vercel() na lista de plugins
  plugins: [react(), vercel(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));