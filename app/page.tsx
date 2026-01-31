"use client";

import Link from "next/link";
import {
  ArrowRight,
  MessageSquare,
  Zap,
  Shield,
  Clock,
  Sparkles,
  Rocket,
  MousePointer2,
  TrendingUp,
  ChevronRight,
  Play
} from "lucide-react";
import { Navigation } from "@/components/ui/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white selection:bg-primary selection:text-white overflow-x-hidden">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-4">
        {/* Background Blobs */}
        <div className="absolute top-0 right-0 w-[60rem] h-[60rem] bg-primary/5 rounded-full blur-[120px] -mr-[30rem] -mt-[20rem] animate-pulse" />
        <div className="absolute top-[20%] left-0 w-[40rem] h-[40rem] bg-indigo-500/5 rounded-full blur-[100px] -ml-[20rem] pointer-events-none" />

        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-4 px-6 py-3 bg-white border border-slate-50 rounded-full mb-12 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.1)] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary fill-primary" />
            </div>
            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
              Built for the next generation of Indian Creators <span className="text-[7px] align-top">IN</span>
            </span>
          </div>

          <h1 className="text-7xl md:text-8xl lg:text-9xl font-[900] text-[#1e293b] tracking-tighter leading-[0.8] mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Reply Karo, <br />
            <span className="text-primary italic">Reach Badao!</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 font-bold leading-relaxed mb-12 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
            Turn every Instagram comment into a meaningful connection. <br className="hidden md:block" />
            Automate DMs, engage your audience, and grow your community <span className="text-slate-900 border-b-2 border-slate-900 pb-0.5">effortlessly</span>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-16 duration-700 delay-300">
            <Link href="/signin">
              <Button className="h-16 px-12 rounded-[2rem] bg-primary hover:bg-primary/90 text-white font-black text-[15px] uppercase tracking-widest shadow-2xl shadow-primary/30 flex items-center gap-4 group transition-all active:scale-95">
                Get Started For Free
                <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" className="h-16 px-10 rounded-[2rem] border-slate-200 hover:bg-slate-50 text-slate-600 font-black text-[15px] uppercase tracking-widest transition-all">
                View Honest Pricing
              </Button>
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 opacity-40 animate-in fade-in duration-1000 delay-500">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
              <Shield className="h-4 w-4" /> Meta Verified API
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
              <MousePointer2 className="h-4 w-4" /> 1-Click Setup
            </p>
          </div>
        </div>

        {/* Hero Feature Visualization */}
        <div className="container mx-auto mt-24 relative">
          <div className="relative mx-auto max-w-5xl group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-indigo-500/20 to-primary/20 rounded-[3.5rem] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
            <div className="relative bg-white rounded-[3rem] border border-slate-100 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.1)] overflow-hidden">
              <div className="aspect-[4/5] sm:aspect-[16/10] md:aspect-[16/9] bg-slate-50 flex items-center justify-center relative group/vid">
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 transform group-hover/vid:scale-110 transition-all duration-700">
                    <Play className="h-7 w-7 md:h-10 md:w-10 fill-current ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-5 left-5 right-5 md:bottom-8 md:left-8 md:right-8 flex items-center justify-center md:justify-between z-10">
                  <div className="bg-white/90 backdrop-blur-xl px-4 py-3 md:px-6 md:py-4 rounded-2xl border border-white shadow-xl flex items-center gap-3 md:gap-4 animate-bounce">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-green-500 rounded-full flex items-center justify-center text-white shrink-0">
                      <Zap className="h-4 w-4 md:h-5 md:w-5 fill-current" />
                    </div>
                    <div>
                      <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Delivery</p>
                      <p className="text-xs md:text-sm font-black text-slate-900">+1 Meaningful Connection</p>
                    </div>
                  </div>
                  <div className="bg-slate-900 px-6 py-4 rounded-2xl shadow-2xl hidden md:flex items-center gap-4 translate-y-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Growth Impact</p>
                      <p className="text-sm font-black text-white">847 connections made today</p>
                    </div>
                  </div>
                </div>
                <img src="/dashboard-preview.png" alt="ReplyKaro Dashboard" className="w-full h-full object-cover opacity-20 grayscale" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 bg-slate-50/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-24">
            <Badge className="bg-slate-900/5 text-slate-900 border-none px-4 py-1.5 rounded-full mb-6 uppercase tracking-[0.2em] text-[10px] font-black">
              Engineered for Engagement
            </Badge>
            <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter mb-6">
              Everything you need <br />
              to build your <span className="text-primary italic">Instagram Community.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <MessageSquare className="h-7 w-7" />,
                title: "Smart Keyword Matching",
                desc: "Specific keywords ya phir generic comments—humare AI triggers har comment ko analyze karte hain.",
                color: "text-blue-600 bg-blue-50"
              },
              {
                icon: <Zap className="h-7 w-7" />,
                title: "Instant DM Relay",
                desc: "No delays. Comment post hua nahi ki DM gaya—connect with your audience instantly.",
                color: "text-primary bg-primary/5"
              },
              {
                icon: <Clock className="h-7 w-7" />,
                title: "Story Engagement",
                desc: "Replies on stories are pure gold. Auto-respond to story engagements and build deep trust.",
                color: "text-indigo-600 bg-indigo-50"
              },
              {
                icon: <TrendingUp className="h-7 w-7" />,
                title: "Engagement Analytics",
                desc: "Track every click, every conversation. Real-time metrics dikhate hain aapka community kitna grow ho raha hai.",
                color: "text-emerald-600 bg-emerald-50"
              },
              {
                icon: <Shield className="h-7 w-7" />,
                title: "Protection Shields",
                desc: "Meta-approved rate limits aur anti-spam protection ensure karte hain aapka account safe rahe.",
                color: "text-orange-600 bg-orange-50"
              },
              {
                icon: <Rocket className="h-7 w-7" />,
                title: "1-Click Launch",
                desc: "No complex tech stuff. Just select your Reel, set your word, and you're live in 30 seconds.",
                color: "text-rose-600 bg-rose-50"
              }
            ]
              .map((feat, i) => (
                <div key={i} className="group p-10 bg-white rounded-[3rem] border border-slate-100 hover:border-primary/20 transition-all duration-500 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)]">
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 group-hover:rotate-3", feat.color)}>
                    {feat.icon}
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">{feat.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">{feat.desc}</p>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* Localized CTA Section */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-900" />
        <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-primary/20 rounded-full blur-[120px] -mr-[25rem] -mt-[25rem]" />
        <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-indigo-500/10 rounded-full blur-[100px] -ml-[20rem] -mb-[20rem]" />

        <div className="container mx-auto relative z-10">
          <div className="max-w-5xl mx-auto bg-white/5 backdrop-blur-3xl rounded-[4rem] border border-white/10 p-10 md:p-24 text-center">
            <Badge className="bg-primary text-white border-none px-6 py-2 rounded-full mb-8 uppercase tracking-[0.3em] text-[11px] font-black shadow-xl shadow-primary/20">
              Launch Your Engine
            </Badge>
            <h2 className="text-4xl md:text-7xl font-black text-slate-100 tracking-tighter mb-8 leading-[1.1] md:leading-tight">
              Bahut hua manual replies. <br />
              Ab karo <span className="text-primary italic">Smart Engagement.</span>
            </h2>
            <p className="text-slate-400 text-lg md:text-xl font-bold mb-12 max-w-2xl mx-auto leading-relaxed">
              Join 5,000+ creators building authentic communities with instant, personal responses.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/signin" className="w-full sm:w-auto">
                <Button className="w-full h-16 px-12 rounded-[2rem] bg-white text-slate-900 hover:bg-slate-100 font-black text-[15px] uppercase tracking-widest shadow-2xl flex items-center justify-center gap-4 group transition-all active:scale-95">
                  Start 7-Day test drive
                  <ChevronRight className="h-5 w-5 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/pricing" className="text-white/60 hover:text-white font-bold tracking-tight border-b border-white/10 pb-1 italic transition-all">
                See all plan details
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="py-20 bg-white px-4 border-t border-slate-50">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex flex-col items-center md:items-start gap-6">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg">
                  <img src="/logo.png" alt="ReplyKaro Logo" className="w-full h-full object-cover" />
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tighter">ReplyKaro</div>
              </Link>
              <p className="text-slate-400 font-medium text-sm text-center md:text-left max-w-xs leading-relaxed">
                Scalable Instagram DM automation <br />
                optimized for the Indian creator economy.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-12 md:gap-20">
              <div className="space-y-6">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Product</p>
                <div className="flex flex-col gap-4">
                  <Link href="/pricing" className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">Pricing</Link>
                  <Link href="/faq" className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">Knowledge Base (FAQ)</Link>
                  <Link href="/about" className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">Our Story</Link>
                  <Link href="/contact" className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">Support Station</Link>
                </div>
              </div>
              <div className="space-y-6">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Legal</p>
                <div className="flex flex-col gap-4">
                  <Link href="/privacy" className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">Privacy Policy</Link>
                  <Link href="/terms" className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">Terms of Service</Link>
                  <Link href="/deletion-status" className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">Data Deletion</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-20 pt-10 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm font-bold text-slate-300">
              &copy; {new Date().getFullYear()} ReplyKaro Engineering. No Credit Card Required.
            </p>
            <div className="flex items-center gap-4 text-slate-300">
              <Shield className="h-4 w-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Secured by Supabase & Meta</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
