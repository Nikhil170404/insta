"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavigationProps {
    hideFeatures?: boolean;
}

export function Navigation({ hideFeatures = false }: NavigationProps) {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        // Auth Check
        fetch("/api/auth/session")
            .then((res) => res.json())
            .then((data) => setIsLoggedIn(!!data.user))
            .catch(() => setIsLoggedIn(false));

        // Scroll listener for nav shrink
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { name: "Features", href: "/#features", hide: hideFeatures },
        { name: "Pricing", href: "/pricing" },
        { name: "FAQ", href: "/faq" },
        { name: "About", href: "/about" },
    ];

    return (
        <>
            <nav className={cn(
                "fixed top-0 left-0 right-0 z-[100] px-4 transition-all duration-500",
                isScrolled ? "py-4" : "py-8"
            )}>
                <div className="container mx-auto flex items-center justify-center gap-3">
                    {/* Main Nav Pill */}
                    <div className="flex items-center justify-between glass-nav px-6 md:px-8 py-4 rounded-[2.5rem] flex-1 max-w-4xl">
                        {/* Logo & Brand Pod */}
                        <Link href="/" className="flex items-center gap-3 md:gap-4 transition-transform hover:scale-105 active:scale-95 group">
                            <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.1)] flex items-center justify-center ring-1 ring-slate-100 group-hover:rotate-12 transition-all duration-500 overflow-hidden shrink-0">
                                <Zap className="h-4 w-4 md:h-5 md:w-5 text-primary fill-primary" />
                            </div>
                            <div className="text-lg md:text-xl font-[900] text-slate-900 tracking-tighter uppercase font-sans whitespace-nowrap">ReplyKaro</div>
                        </Link>

                        {/* Desktop Links */}
                        <div className="hidden md:flex items-center gap-10 mx-8">
                            {navLinks.filter(l => !l.hide).map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className="text-[11px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-[0.2em]"
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>

                        {/* Auth Actions */}
                        <div className="flex items-center gap-2 md:gap-4 ml-4">
                            {isLoggedIn === null ? (
                                <div className="w-24 h-11 bg-slate-100 animate-pulse rounded-2xl" />
                            ) : isLoggedIn ? (
                                <Link href="/dashboard">
                                    <Button className="bg-primary text-white hover:bg-primary/90 rounded-2xl px-6 md:px-8 font-black text-[11px] md:text-[13px] uppercase tracking-widest glow-primary h-11 transition-all active:scale-95">
                                        Engine
                                    </Button>
                                </Link>
                            ) : (
                                <>
                                    <Link href="/signin" className="hidden sm:block">
                                        <Button variant="ghost" className="text-[11px] font-bold text-slate-500 hover:text-primary rounded-2xl px-6 uppercase tracking-widest">
                                            Login
                                        </Button>
                                    </Link>
                                    <Link href="/signin">
                                        <Button className="bg-[#0f172a] text-white hover:bg-black rounded-2xl px-6 md:px-10 font-black text-[12px] uppercase tracking-widest h-11 md:h-12 transition-all active:scale-95 shadow-xl shadow-slate-200/50">
                                            Launch
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Separate Mobile Menu Trigger Pod */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden w-12 h-12 flex items-center justify-center bg-white text-primary rounded-full active:scale-90 transition-all border border-slate-100 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.1)] shrink-0"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            </nav>

            {/* Mobile Sidebar Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] transition-opacity duration-500 pointer-events-none md:hidden",
                    isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Mobile Sidebar Content */}
            <div className={cn(
                "fixed top-4 right-4 bottom-4 w-[280px] z-[120] bg-white shadow-2xl transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col rounded-[2.5rem] border border-slate-100 md:hidden",
                isMobileMenuOpen ? "translate-x-0" : "translate-x-[calc(100%+2rem)]"
            )}>
                <div className="flex items-center justify-between p-6 border-b border-slate-50">
                    <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Menu</span>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="flex-1 p-6 space-y-2">
                    {navLinks.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center justify-between p-4 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-primary transition-all group"
                        >
                            {item.name}
                            <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </Link>
                    ))}
                </nav>

                <div className="p-6 border-t border-slate-50">
                    {!isLoggedIn && (
                        <Link href="/signin" onClick={() => setIsMobileMenuOpen(false)}>
                            <Button className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase tracking-widest glow-primary">
                                Get Started
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </>
    );
}
