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
        manualChunks: {
          // Bundle alle lucide icons samen (voorkomt 20+ separate requests)
          'lucide-icons': ['lucide-react'],
          // React vendor bundle
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI components bundle
          'ui-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-toast',
            '@radix-ui/react-tabs',
            '@radix-ui/react-slot',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
          ],
          // Charting library
          'charts': ['recharts'],
          // Framer motion
          'motion': ['framer-motion'],
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
