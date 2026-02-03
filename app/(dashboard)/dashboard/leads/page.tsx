"use client";

import { useState, useEffect } from "react";
import {
    Mail,
    Download,
    Search,
    User,
    Calendar,
    Instagram,
    Filter,
    Sparkles,
    TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Lead {
    id: string;
    instagram_username: string;
    instagram_user_id: string;
    email: string | null;
    phone: string | null;
    created_at: string;
    source: string;
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState<"all" | "with_email" | "no_email">("all");

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            const res = await fetch("/api/leads");
            const data = await res.json();
            setLeads(data.leads || []);
        } catch (error) {
            console.error("Error fetching leads:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.instagram_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.email?.toLowerCase().includes(searchTerm.toLowerCase());

        if (filter === "with_email") return matchesSearch && lead.email;
        if (filter === "no_email") return matchesSearch && !lead.email;
        return matchesSearch;
    });

    const exportCSV = () => {
        const headers = ["Instagram Username", "Email", "Phone", "Source", "Date"];
        const rows = filteredLeads.map(l => [
            l.instagram_username || "",
            l.email || "",
            l.phone || "",
            l.source || "instagram_dm",
            new Date(l.created_at).toLocaleDateString()
        ]);

        const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `replykaro-leads-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                        <Mail className="h-8 w-8 text-primary" />
                        Email Leads
                    </h1>
                    <p className="text-slate-400 font-medium mt-1">
                        Captured from your Instagram automations
                    </p>
                </div>
                <Button
                    onClick={exportCSV}
                    disabled={filteredLeads.length === 0}
                    className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-bold gap-3 hover:bg-slate-800"
                >
                    <Download className="h-5 w-5" />
                    Export CSV
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{leads.length}</p>
                            <p className="text-sm text-slate-400 font-medium">Total Leads</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                            <Mail className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">
                                {leads.filter(l => l.email).length}
                            </p>
                            <p className="text-sm text-slate-400 font-medium">With Email</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">
                                {leads.length > 0 ? Math.round((leads.filter(l => l.email).length / leads.length) * 100) : 0}%
                            </p>
                            <p className="text-sm text-slate-400 font-medium">Capture Rate</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by username or email..."
                        className="w-full h-14 pl-12 pr-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-medium"
                    />
                </div>
                <div className="flex gap-2">
                    {(["all", "with_email", "no_email"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-6 h-14 rounded-2xl font-bold text-sm transition-all",
                                filter === f
                                    ? "bg-slate-900 text-white"
                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            {f === "all" ? "All" : f === "with_email" ? "With Email" : "No Email"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leads Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-slate-400 font-medium">Loading leads...</p>
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="p-20 text-center">
                        <Sparkles className="h-16 w-16 text-slate-200 mx-auto mb-6" />
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No leads yet</h3>
                        <p className="text-slate-400 mb-6">
                            Enable email capture in your automations to start collecting leads
                        </p>
                        <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs font-bold">
                            Growth Plan Feature
                        </Badge>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="text-left py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Instagram</th>
                                    <th className="text-left py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                                    <th className="text-left py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Source</th>
                                    <th className="text-left py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-5 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                                                    {lead.instagram_username?.charAt(0).toUpperCase() || "?"}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">@{lead.instagram_username || "unknown"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6">
                                            {lead.email ? (
                                                <span className="font-medium text-slate-900">{lead.email}</span>
                                            ) : (
                                                <span className="text-slate-300 font-medium">Not captured</span>
                                            )}
                                        </td>
                                        <td className="py-5 px-6">
                                            <Badge className="bg-slate-100 text-slate-600 border-none text-[10px] font-bold uppercase tracking-wider">
                                                {lead.source || "DM"}
                                            </Badge>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Calendar className="h-4 w-4" />
                                                <span className="text-sm font-medium">
                                                    {new Date(lead.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
