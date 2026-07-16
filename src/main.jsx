import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import App from "./App";
import "./index.css";

// Take over scroll handling from the browser: on reload it would otherwise
// restore the previous position, which (with async content) lands mid-page and
// skips the hero animations. ScrollManager in App.jsx handles top/restore.
if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);