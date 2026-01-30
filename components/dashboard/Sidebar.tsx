"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Zap,
  BarChart3,
  Settings,
  LogOut,
  CreditCard,
  BookOpen,
  Menu,
  X,
  User,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/session";

interface SidebarProps {
  user: SessionUser;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Automations", href: "/dashboard/automations", icon: Zap },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* --- DESKTOP SIDEBAR --- */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col z-50">
        <div className="flex flex-col flex-grow bg-white border-r border-slate-100 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
          {/* Logo Section */}
          <div className="flex items-center h-20 px-8">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform flex items-center justify-center bg-white">
                <img src="/logo.png" alt="ReplyKaro Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                ReplyKaro
              </span>
            </Link>
          </div>

          {/* Navigation Section */}
          <div className="flex-1 px-4 py-8 space-y-1">
            <p className="px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              Main Menu
            </p>
            <nav className="space-y-1.5">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 group",
                      isActive
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <item.icon className={cn(
                      "h-5 w-5",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-primary transition-colors"
                    )} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Pro Badge Card */}
          <div className="px-6 mb-8">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-110 transition-transform" />
              <div className="relative z-10">
                <p className="text-white font-bold text-sm mb-1 italic">Revenue Boost</p>
                <p className="text-slate-400 text-xs mb-4 leading-relaxed">Turn your stories & reels into a 24/7 sales machine.</p>
                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center justify-center w-full py-2 bg-primary hover:bg-primary/90 text-white text-[11px] font-bold rounded-xl transition-all shadow-lg shadow-primary/20"
                >
                  START 3-MONTH TRIAL
                </Link>
              </div>
            </div>
          </div>

          {/* User Section */}
          <div className="border-t border-slate-50 p-6 bg-slate-50/30">
            <div className="flex items-center gap-4">
              <div className="relative transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-primary/10">
                  {user.instagram_username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" title="Active" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-900 truncate">
                  @{user.instagram_username}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md",
                    user.plan_type === "trial" ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                  )}>
                    {user.plan_type}
                  </span>
                </div>
              </div>
              <a href="/api/auth/logout" className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                <LogOut className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* --- MOBILE HEADER & MENU --- */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] bg-white border-b border-slate-100 px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white shadow-sm">
            <img src="/logo.png" alt="ReplyKaro Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">ReplyKaro</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl active:scale-95 transition-all"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Slide-over Overlay */}
      <div className={cn(
        "lg:hidden fixed inset-0 z-[55] bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300",
        isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )} onClick={() => setIsMobileMenuOpen(false)} />

      {/* Mobile Sidebar Content */}
      <div className={cn(
        "lg:hidden fixed top-[64px] left-0 bottom-0 w-[280px] z-[58] bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all",
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-50 bg-slate-50/30">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold">
              {user.instagram_username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">@{user.instagram_username}</p>
              <p className="text-xs text-slate-500 uppercase font-black tracking-wider">{user.plan_type} plan</p>
            </div>
          </div>
          <a
            href="/api/auth/logout"
            className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-rose-500 bg-rose-50 rounded-2xl active:scale-95 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Logout Account
          </a>
        </div>
      </div>
    </>
  );
}
