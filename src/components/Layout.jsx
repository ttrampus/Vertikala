import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Mountain, Menu, X, PenLine, LayoutDashboard, Home as HomeIcon, Info as InfoIcon, Mail as MailIcon, LogIn, Shield, GraduationCap, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { path: "/", label: "Home", icon: HomeIcon },
  { path: "/about", label: "About", icon: InfoIcon },
  { path: "/contact", label: "Contact", icon: MailIcon },
  { path: "/alpine-school", label: "School", icon: GraduationCap },
  { path: "/events", label: "Events", icon: CalendarDays },
];

export default function Layout() {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center py-8 z-50 bg-card/80 backdrop-blur-xl border-r border-border">
        <Link to="/" className="mb-12">
          <Mountain className="h-8 w-8 text-primary" />
        </Link>
        <div className="flex flex-col items-center gap-2 flex-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all duration-200 group w-16 ${
                location.pathname === path
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </Link>
          ))}
          {user && (
            <>
              <Link
                to="/create"
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all duration-200 w-16 ${
                  location.pathname === "/create"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <PenLine className="h-5 w-5" />
                <span className="text-[10px] font-medium tracking-wide">Write</span>
              </Link>
              <Link
                to="/dashboard"
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all duration-200 w-16 ${
                  location.pathname === "/dashboard"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-[10px] font-medium tracking-wide">Posts</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all duration-200 w-16 ${
                    location.pathname === "/admin"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Shield className="h-5 w-5" />
                  <span className="text-[10px] font-medium tracking-wide">Admin</span>
                </Link>
              )}
            </>
          )}
        </div>
        <div className="mt-auto">
          {user ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={logout}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign out
              </button>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {(user.full_name?.[0] || user.email?.[0] || "U").toUpperCase()}
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex flex-col items-center gap-1 p-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all w-16"
            >
              <LogIn className="h-5 w-5" />
              <span className="text-[10px] font-medium tracking-wide">Log in</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/" className="flex items-center gap-2">
            <Mountain className="h-6 w-6 text-primary" />
            <span className="font-inter font-bold text-lg tracking-tight">Alpine Club</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        {mobileOpen && (
          <div className="border-t border-border bg-card px-4 py-4 animate-fade-in">
            <div className="flex flex-col gap-1">
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    location.pathname === path
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{label}</span>
                </Link>
              ))}
              {user && (
                <>
                  <Link
                    to="/create"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent"
                  >
                    <PenLine className="h-5 w-5" />
                    <span className="font-medium">Write</span>
                  </Link>
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    <span className="font-medium">My Posts</span>
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        location.pathname === "/admin"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <Shield className="h-5 w-5" />
                      <span className="font-medium">Admin</span>
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent text-left"
                  >
                    <span className="font-medium">Sign Out</span>
                  </button>
                </>
              )}
              {!user && (
                <Link
                  to="/login"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent"
                >
                  <LogIn className="h-5 w-5" />
                  <span className="font-medium">Log in</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="lg:ml-20 min-h-screen pt-16 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}