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

// Without a boundary, any error thrown while rendering unmounts the whole app
// and leaves a white page. Show a way out instead.
class RootErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error(error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <div>
          <p style={{ fontSize: 18, margin: "0 0 16px" }}>Prišlo je do napake pri prikazu strani.</p>
          <button onClick={() => window.location.reload()} style={{ fontSize: 16, padding: "10px 22px", border: 0, borderRadius: 6, background: "#E8501A", color: "#fff" }}>
            Osveži stran
          </button>
        </div>
      </div>
    );
  }
}

// Tell the boot safety net in index.html that the app is running.
window.__appMounted = true;
document.getElementById("boot-error")?.remove();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </RootErrorBoundary>
  </React.StrictMode>
);