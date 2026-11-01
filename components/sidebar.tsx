"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Sparkles,
  LayoutDashboard,
  Calendar,
  Images,
  Terminal,
  ShieldAlert,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Assets", href: "/assets", icon: Images },
  { name: "Prompts", href: "/prompts", icon: Terminal },
  { name: "Rejections", href: "/rejections", icon: ShieldAlert },
  { name: "Export", href: "/export", icon: FileSpreadsheet },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <>
      {/* Mobile Top Header with toggle */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-base-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pastel-lavender to-pastel-blue text-charcoal-900 flex items-center justify-center font-bold text-sm shadow-sm">
            <Sparkles className="w-4 h-4 text-charcoal-900" />
          </div>
          <span className="font-bold text-charcoal-900 text-sm tracking-tight">StockFlow AI</span>
        </div>

        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label="Toggle Navigation Menu"
          className="p-2 rounded-full bg-white border border-base-border text-charcoal-900 shadow-sm"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-charcoal-900/30 backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Desktop & Mobile Rail Sidebar */}
      <aside
        aria-label="Main Navigation"
        className={`fixed z-50 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isMobileOpen ? "top-3 bottom-3 left-3 w-[240px] flex" : "hidden md:flex"}
          md:top-3 md:bottom-3 md:left-3 md:w-[72px] md:hover:w-[240px] md:focus-within:w-[240px]
          rounded-[28px] bg-gradient-to-b from-[#DCD3EC] via-[#D8D4EE] to-[#D0DEEE]
          border border-white/70 shadow-[0_10px_35px_-5px_rgba(74,59,105,0.12)]
          flex flex-col justify-between p-3.5 group select-none overflow-hidden
        `}
      >
        {/* Top: Logo & Brand */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1 pt-1">
            <Link
              href="/"
              className="flex items-center gap-3 w-full"
              aria-label="StockFlow AI Home"
            >
              <div className="w-11 h-11 rounded-full bg-white text-charcoal-900 flex items-center justify-center shadow-sm flex-shrink-0">
                <Sparkles className="w-5 h-5 text-charcoal-900" />
              </div>
              <div className="opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 max-md:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
                <span className="font-bold text-sm tracking-tight text-charcoal-900 block">
                  StockFlow AI
                </span>
                <span className="text-[11px] text-charcoal-700/80 block">
                  Adobe Portfolio
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.name}
                  title={item.name}
                  className={`flex items-center rounded-full h-11 transition-all duration-200 outline-none
                    ${
                      isActive
                        ? "bg-white text-charcoal-900 shadow-sm"
                        : "text-charcoal-700 hover:bg-white/40 hover:text-charcoal-900 focus-visible:bg-white/50"
                    }`}
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 max-md:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden text-xs font-semibold pr-4">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Logout */}
        <div className="pt-2 border-t border-charcoal-900/10">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Sign Out"
            title="Sign Out"
            className="w-full flex items-center rounded-full h-11 text-charcoal-700 hover:bg-white/40 hover:text-rose-600 transition-all duration-200 outline-none cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 max-md:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden text-xs font-semibold pr-4">
              {loggingOut ? "Signing out..." : "Sign Out"}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
