import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";

const EASE = [0.16, 1, 0.3, 1] as const;

const row = (label: string, value: any) =>
    value !== undefined && value !== null && value !== "" ? (
        <div className="flex flex-col gap-0.5">
            <p className="text-[9px] uppercase font-bold tracking-[0.14em] text-stone-400">{label}</p>
            <p className="text-sm font-semibold text-stone-700">{String(value)}</p>
        </div>
    ) : null;

const badge = (text: string, color: string) => (
    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize"
        style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
        {text}
    </span>
);

export default function InsuranceDetail() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const session = JSON.parse(localStorage.getItem("aqua-session") || "{}");
        if (!session.farmerId) { navigate("/login", { replace: true }); return; }
        axios.get(`/api/insurances?farmerId=${session.farmerId}`)
            .then(r => setPolicies(r.data.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const statusColor = (s: string) => s === "active" ? "#2d9b7f" : s === "expired" ? "#ef4444" : "#b5813a";

    return (
        <div className="min-h-screen bg-stone-50 pb-28" style={{ fontFamily: "'Sora', sans-serif" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

            {/* Header */}
            <div className="px-5 pt-14 pb-7 rounded-b-[2.5rem] relative overflow-hidden"
                style={{ background: "linear-gradient(140deg,#1c4a3e 0%,#1c6b5a 45%,#2d9b7f 100%)", boxShadow: "0 8px 32px -6px rgba(28,74,62,0.28)" }}>
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/dashboard")}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-lg font-bold text-white tracking-tight">{t("dashboard.insurance")}</h1>
                    </div>
                    <span className="text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15">
                        Aqua <span className="text-amber-300">AI</span>nsure
                    </span>
                </div>
            </div>

            <div className="px-4 mt-5">
                {loading ? (
                    <p className="text-center text-sm text-stone-400 pt-10">Loading...</p>
                ) : policies.length === 0 ? (
                    <p className="text-center text-sm text-stone-400 pt-10">No insurance policies found.</p>
                ) : (
                    policies.map((policy, i) => (
                        <motion.div key={policy._id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ ease: EASE, duration: 0.5, delay: i * 0.07 }} className="mb-4">

                            {/* Policy header */}
                            <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-stone-100 shadow-sm mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                                        <ShieldCheck size={18} className="text-teal-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-stone-800 capitalize">{policy.insuranceType} Policy</p>
                                        <p className="text-xs text-stone-400">{policy.species}</p>
                                    </div>
                                </div>
                                {badge(policy.status || "active", statusColor(policy.status || "active"))}
                            </div>

                            <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm mb-3">
                                <p className="text-[9px] uppercase font-black tracking-[0.18em] mb-3 text-teal-600">Culture Details</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {row("Stocking Date", policy.stockingDate ? new Date(policy.stockingDate).toLocaleDateString() : null)}
                                    {row("Stocking Density", policy.stockingDensity ? `${policy.stockingDensity} PL/m²` : null)}
                                    {row("Species", policy.species)}
                                    {row("Duration", policy.insurancePeriodDays ? `${policy.insurancePeriodDays} days` : null)}
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                                <p className="text-[9px] uppercase font-black tracking-[0.18em] mb-3 text-teal-600">Harvest Plan</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {row("Planned Harvest", policy.plannedHarvestDate ? new Date(policy.plannedHarvestDate).toLocaleDateString() : null)}
                                    {row("Max Harvest Date", policy.maxHarvestDate ? new Date(policy.maxHarvestDate).toLocaleDateString() : null)}
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
            <BottomNav />
        </div>
    );
}
