import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import Layout from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Home from "@/pages/Home";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import CreatePost from "@/pages/CreatePost";
import Dashboard from "@/pages/Dashboard";
import School from "@/pages/AlpineSchool";
import Events from "@/pages/Events";
import PageNotFound from "@/lib/PageNotFound";
import PostDetail from "@/pages/PostDetail";
import EditPost from "@/pages/EditPost"
import AdminDashboard from "@/pages/AdminDashboard"
import Login from "@/pages/Login";


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
    <Route path="alpine-school" element={<School />} />
    <Route path="events" element={<Events />} />

 
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
 
    // Protected: admin only
    <Route path="admin" element={
      <ProtectedRoute adminOnly>
        <AdminDashboard />
      </ProtectedRoute>
    } />
  </Route>
</Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}