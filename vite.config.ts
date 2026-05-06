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
