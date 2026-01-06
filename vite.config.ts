import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // Defer SW registration to improve LCP
      includeAssets: ["favicon.svg", "favicon.ico", "robots.txt"],
      manifest: {
        name: "Perimenopauze Plan",
        short_name: "Perimeno",
        description: "Inzicht in je cyclus, slaap, eetdagboek en hormonale klachten.",
        theme_color: "#C396AC",
        background_color: "#FBF4F1",
        display: "standalone",
        orientation: "portrait",
        start_url: "/login",
        icons: [
          {
            src: "/pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Bundle lucide icons together (prevents 20+ separate requests)
          if (id.includes('lucide-react')) {
            return 'lucide-icons';
          }
          // Bundle Radix UI components together
          if (id.includes('@radix-ui')) {
            return 'ui-radix';
          }
          // Bundle recharts separately (large library)
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'charts';
          }
          // Let Vite handle react, react-dom, framer-motion automatically
          // to avoid duplicate React instances
        },
      },
    },
    // Remove sourcemaps in production for smaller bundles
    sourcemap: false,
  },
  // Pre-bundle lucide for faster dev starts
  optimizeDeps: {
    include: ['lucide-react'],
  },
}));
