import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config"; // Initialize i18n

// Initialize Sentry in production only
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: "https://39464de7b0f86a13c0cd866c5c1449bd@o4510652389654528.ingest.de.sentry.io/4510652402368592",
    environment: "production",
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      // Privacy: filter sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      // Remove user email/IP for GDPR
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);

// Defer service worker registration to improve LCP
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed, continue without it
    });
  });
}
