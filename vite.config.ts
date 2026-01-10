import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import Sitemap from "vite-plugin-sitemap";

// Public routes for sitemap (no auth required)
const publicRoutes = [
  "/",
  "/pricing",
  "/login",
  "/privacy",
  "/terms",
  "/intended-use",
  "/install",
];

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
        // Exclude Supabase and external API URLs from service worker caching
        navigateFallbackDenylist: [/^\/api\//, /supabase\.co/],
        runtimeCaching: [
          {
            // Cache static assets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Never cache Supabase auth/API requests - always go to network
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // Never cache other external APIs
            urlPattern: /^https:\/\/api\.(mollie|resend)\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
    Sitemap({
      hostname: "https://www.perimenopauzeplan.nl",
      dynamicRoutes: publicRoutes,
      exclude: ["/404"],
      changefreq: "weekly",
      priority: 0.8,
      lastmod: new Date(),
      generateRobotsTxt: false, // We already have a robots.txt
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
