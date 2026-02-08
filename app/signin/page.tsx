import Link from "next/link";
import { Instagram, ArrowLeft, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function SignInPage() {
  // If already logged in, redirect to dashboard
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden selection:bg-primary selection:text-white">
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-primary/5 rounded-full blur-[120px] -mr-[25rem] -mt-[25rem] animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-indigo-500/5 rounded-full blur-[100px] -ml-[20rem] -mb-[20rem]" />

      <div className="w-full max-w-lg relative z-10">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-colors mb-8 group ml-4">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-black uppercase tracking-widest">Back to Mission</span>
        </Link>

        {/* Sign In Card */}
        <div className="bg-white rounded-[3.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.08)] border border-slate-100 p-8 md:p-16 text-center">
          {/* Logo Area */}
          <div className="mb-10">
            <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-slate-100">
              <img src="/logo.png" alt="ReplyKaro Logo" className="w-12 h-12 object-cover" />
            </div>
            <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-full mb-4">
              Creator Gateway 🚪
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-tight">
              Ready to scale <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">at Warp Speed?</span>
            </h1>
          </div>

          {/* Instagram Sign In Button */}
          <div className="space-y-6">
            <a
              href="/api/auth/instagram"
              className="group relative w-full flex items-center justify-center gap-4 bg-slate-900 text-white rounded-[2rem] px-8 py-6 font-black text-sm uppercase tracking-[0.15em] hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 active:scale-95"
            >
              <Instagram className="h-6 w-6" />
              Launch with Instagram
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-500/20 to-orange-400/20 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>

            <div className="flex items-center justify-center gap-6 opacity-40">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <ShieldCheck className="h-4 w-4" /> Meta Verified
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <Sparkles className="h-4 w-4" /> Free Forever
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-12">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em]">
              <span className="px-4 bg-white text-slate-400 italic">
                Requirement Check
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid gap-4 text-left">
            {[
              { icon: <Zap className="h-4 w-4" />, text: "Instagram Business or Creator account required" },
              { icon: <ShieldCheck className="h-4 w-4" />, text: "Official Meta API Permissions enabled" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm border border-slate-100">
                  {item.icon}
                </div>
                <span className="text-xs font-bold text-slate-500 leading-tight">
                  {item.text}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-12 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            Sabki pahunch mein automation &bull; ReplyKaro Engine
          </p>
        </div>

        {/* Footer */}
        <div className="mt-10 flex flex-wrap justify-center gap-8 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
          <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
          <Link href="/contact" className="hover:text-primary transition-colors">Support</Link>
        </div>
      </div>
    </div>
  );
}
