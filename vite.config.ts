import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    hmr: {
      overlay: true,
    },
  },
  build: {
    rollupOptions: {
      output: {
        // "[name].[hash]" instead of Vite's default "[name]-[hash]": the
        // 2026-09-13 deploy left browsers holding index.html cached for a year
        // under old asset URLs (see functions/assets/[[path]].js). A new naming
        // scheme guarantees none of those URLs is ever requested again.
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash][extname]",
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-tiptap": ["@tiptap/react", "@tiptap/starter-kit"],
          "vendor-motion": ["framer-motion"],
          "vendor-radix": ["@radix-ui/react-dialog", "@radix-ui/react-tabs", "@radix-ui/react-alert-dialog"],
        },
      },
    },
  },
});
