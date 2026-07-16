import React, { lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import Layout from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AdminMfaGate from "@/pages/AdminMfaGate";

// Pages are code-split so each route loads its own chunk on demand. This keeps
// the initial bundle small — e.g. the heavy TipTap editor (~380 KB) only loads
// when visiting the create/edit pages, not on the homepage.
const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const CreatePost = lazy(() => import("@/pages/CreatePost"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const School = lazy(() => import("@/pages/AlpineSchool"));
const Events = lazy(() => import("@/pages/Events"));
const PostDetail = lazy(() => import("@/pages/PostDetail"));
const EditPost = lazy(() => import("@/pages/EditPost"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const Login = lazy(() => import("@/pages/Login"));
const CompleteProfile = lazy(() => import("@/pages/CompleteProfile"));
const Vzponi = lazy(() => import("@/pages/Vzponi"));
const Profile = lazy(() => import("@/pages/Profile"));


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
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}