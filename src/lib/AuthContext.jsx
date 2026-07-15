import React, { createContext, useState, useContext, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [authError, setAuthError] = useState(null);

  // AUTH STATE
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setIsAuthenticated(!!u);
      setIsLoadingAuth(false);
      if (!u) setIsLoadingProfile(false);
    });

    return () => subscription.unsubscribe();
  }, []);;

// PROFILE LOAD
useEffect(() => {
  if (!user?.id) {
    setProfile(null);
    return;
  }

  const loadProfile = async () => {
    setIsLoadingProfile(true);
    const { data, error } = await supabase
      .from("profile")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Profile load error:", error);
      setProfile(null);
    } else {
      setProfile(data);
    }
    setIsLoadingProfile(false);
  };

  loadProfile();
}, [user?.id]);

  // Map Supabase's English auth errors to Slovene messages for the UI.
  const authErrorToSlovene = (message) => {
    const m = (message || "").toLowerCase();
    if (m.includes("invalid login credentials")) return "Napačen e-poštni naslov ali geslo.";
    if (m.includes("email not confirmed")) return "E-poštni naslov še ni potrjen. Preverite svojo e-pošto.";
    if (m.includes("too many requests") || m.includes("rate limit")) return "Preveč poskusov. Poskusite znova čez nekaj minut.";
    if (m.includes("network")) return "Napaka pri povezavi. Preverite internetno povezavo.";
    return "Prijava ni uspela. Poskusite znova.";
  };

  const login = async (email, password) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setAuthError(authErrorToSlovene(error.message));
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
    window.location.href = "/";
  };

  // ✅ IMPORTANT FIX: wait for profile too
  const isAdmin = profile?.role === "admin";

  const isLoading = isLoadingAuth || isLoadingProfile;
  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated,
        isLoadingAuth: isLoading,
        isLoadingProfile,
        authError,
        isAdmin,
        login,
        logout,
        setAuthError,
        setProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);