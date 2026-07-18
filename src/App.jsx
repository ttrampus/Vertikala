import React, { lazy, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigationType } from "react-router-dom";

import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import Layout from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AdminMfaGate from "@/pages/AdminMfaGate";

// A failed dynamic import almost always means a stale chunk: a new version was
// deployed, so the hashed chunk name the loaded page asked for no longer exists
// (the host returns index.html, hence the "MIME type text/html" error → white
// screen). Reload once to fetch the fresh index.html with current chunk names.
// A sessionStorage flag prevents an infinite reload loop on a genuine failure.
function lazyWithRetry(importer) {
  return lazy(async () => {
    try {
      const mod = await importer();
      sessionStorage.removeItem("chunk-reload");
      return mod;
    } catch (err) {
      if (!sessionStorage.getItem("chunk-reload")) {
        sessionStorage.setItem("chunk-reload", "1");
        window.location.reload();
        return new Promise(() => {}); // stay pending while the page reloads
      }
      throw err; // already retried once — let the error surface
    }
  });
}

// Pages are code-split so each route loads its own chunk on demand. This keeps
// the initial bundle small — e.g. the heavy TipTap editor (~380 KB) only loads
// when visiting the create/edit pages, not on the homepage.
const Home = lazyWithRetry(() => import("@/pages/Home"));
const About = lazyWithRetry(() => import("@/pages/About"));
const Contact = lazyWithRetry(() => import("@/pages/Contact"));
const CreatePost = lazyWithRetry(() => import("@/pages/CreatePost"));
const Dashboard = lazyWithRetry(() => import("@/pages/Dashboard"));
const School = lazyWithRetry(() => import("@/pages/AlpineSchool"));
const Events = lazyWithRetry(() => import("@/pages/Events"));
const PostDetail = lazyWithRetry(() => import("@/pages/PostDetail"));
const EditPost = lazyWithRetry(() => import("@/pages/EditPost"));
const AdminDashboard = lazyWithRetry(() => import("@/pages/AdminDashboard"));
const Login = lazyWithRetry(() => import("@/pages/Login"));
const CompleteProfile = lazyWithRetry(() => import("@/pages/CompleteProfile"));
const Vzponi = lazyWithRetry(() => import("@/pages/Vzponi"));
const Profile = lazyWithRetry(() => import("@/pages/Profile"));


// Scroll behavior: start at the top on first load/reload and on normal
// navigation (so hero animations play from the top); restore the saved
// position only on browser back/forward, so "open a post → back" keeps its spot.
// history.scrollRestoration must be "manual", otherwise the browser ALSO
// restores scroll after reload/back on its own schedule and the page "jumps"
// once content loads, fighting this component.
if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";

function ScrollManager() {
  const location = useLocation();
  const navType = useNavigationType(); // POP (back/fwd) | PUSH | REPLACE
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      window.scrollTo(0, 0); // initial load / reload → top
      return;
    }
    if (navType !== "POP") {
      window.scrollTo(0, 0);
      return;
    }

    // Back/forward: the target page's content usually hasn't loaded yet, so
    // the document is too short to scroll to the saved spot. Keep nudging the
    // scroll as the page grows until the position is reachable (or ~3s pass),
    // and stop immediately if the user scrolls on their own.
    const saved = parseInt(sessionStorage.getItem(`scroll:${location.key}`) || "0", 10);
    if (!saved) { window.scrollTo(0, 0); return; }

    let cancelled = false;
    const cancel = () => { cancelled = true; };
    window.addEventListener("wheel", cancel, { passive: true, once: true });
    window.addEventListener("touchmove", cancel, { passive: true, once: true });

    const deadline = performance.now() + 3000;
    const attempt = () => {
      if (cancelled) return cleanup();
      const reachable = document.documentElement.scrollHeight - window.innerHeight;
      if (reachable >= saved) {
        window.scrollTo(0, saved);
        return cleanup();
      }
      window.scrollTo(0, reachable); // best effort while content streams in
      if (performance.now() < deadline) requestAnimationFrame(attempt);
      else cleanup();
    };
    const cleanup = () => {
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchmove", cancel);
    };
    requestAnimationFrame(attempt);
    return () => { cancelled = true; cleanup(); };
  }, [location.key, navType]);

  useEffect(() => {
    const save = () => sessionStorage.setItem(`scroll:${location.key}`, String(window.scrollY));
    window.addEventListener("scroll", save, { passive: true });
    return () => { save(); window.removeEventListener("scroll", save); };
  }, [location.key]);

  return null;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError } = useAuth(); // remove isLoadingPublicSettings and navigateToLogin

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError?.type === "user_not_registered") return <UserNotRegisteredError />;


  return (
    <Routes>
  <Route path="/" element={<Layout />}>
    <Route index element={<Home />} />
    <Route path="post/:id" element={<PostDetail />} />
    <Route path="about" element={<About />} />
    <Route path="contact" element={<Contact />} />
    <Route path="login" element={<Login />} />
    <Route path="complete-profile" element={<CompleteProfile />} />
    <Route path="alpine-school" element={<School />} />
    <Route path="events" element={<Events />} />
    <Route path="vzponi" element={<Vzponi />} />

 
    // Protected: must be logged in
    <Route path="create" element={
      <ProtectedRoute>
        <CreatePost />
      </ProtectedRoute>
    } />
    <Route path="edit/:id" element={
      <ProtectedRoute>
        <EditPost />
      </ProtectedRoute>
    } />
    <Route path="dashboard" element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    } />
    <Route path="profile" element={
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    } />
 
    // Protected: admin only
    <Route path="admin" element={
      <ProtectedRoute adminOnly>
        <AdminMfaGate>
          <AdminDashboard />
        </AdminMfaGate>
      </ProtectedRoute>
    } />
  </Route>
</Routes>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <Router>
            <ScrollManager />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}