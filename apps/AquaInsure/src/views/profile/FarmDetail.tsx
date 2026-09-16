import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ChevronLeft, Landmark, Droplets } from "lucide-react";
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

export default function FarmDetail() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [farms, setFarms] = useState<any[]>([]);
    const [ponds, setPonds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const session = JSON.parse(localStorage.getItem("aqua-session") || "{}");
        if (!session.farmerId) { navigate("/login", { replace: true }); return; }
        const id = session.farmerId;
        Promise.all([
            axios.get(`/api/farms/${id}`),
            axios.get(`/api/entries/daily?farmerId=${id}`).catch(() => ({ data: { data: [] } }))
        ]).then(([farmRes]) => {
            setFarms(farmRes.data.data || []);
        }).catch(() => { })
            .finally(() => setLoading(false));

        // Also fetch ponds
        axios.get(`/api/farms/${id}`)
            .catch(() => { });
    }, []);

    return (
        <div className="min-h-screen bg-stone-50 pb-28" style={{ fontFamily: "'Sora', sans-serif" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

            {/* Header */}
            <div className="px-5 pt-14 pb-7 rounded-b-[2.5rem] relative overflow-hidden"
                style={{ background: "linear-gradient(140deg,#7c4a1e 0%,#c9922a 55%,#e6a832 100%)", boxShadow: "0 8px 32px -6px rgba(124,74,30,0.28)" }}>
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/dashboard")}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-lg font-bold text-white tracking-tight">{t("dashboard.farm")}</h1>
                    </div>
                    <span className="text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15">
                        Aqua <span className="text-amber-300">AI</span>nsure
                    </span>
                </div>
            </div>

            <div className="px-4 mt-5 space-y-4">
                {loading ? (
                    <p className="text-center text-sm text-stone-400 pt-10">Loading...</p>
                ) : farms.length === 0 ? (
                    <p className="text-center text-sm text-stone-400 pt-10">No farms registered yet.</p>
                ) : (
                    farms.map((farm, i) => (
                        <motion.div key={farm._id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ ease: EASE, duration: 0.5, delay: i * 0.07 }}>

                            {/* Farm header card */}
                            <div className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-amber-100 shadow-sm mb-3">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                                    <Landmark size={20} className="text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-stone-800">Farm {i + 1}</p>
                                    <p className="text-xs text-stone-400">{farm.location?.place}, {farm.location?.district}</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm mb-3">
                                <p className="text-[9px] uppercase font-black tracking-[0.18em] mb-3 text-amber-600">Location</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {row("Place", farm.location?.place)}
                                    {row("Taluk", farm.location?.taluk)}
                                    {row("District", farm.location?.district)}
                                    {row("Latitude", farm.latitude)}
                                    {row("Longitude", farm.longitude)}
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm mb-3">
                                <p className="text-[9px] uppercase font-black tracking-[0.18em] mb-3 text-amber-600">Ownership</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {row("Type", farm.ownership?.type)}
                                    {row("Survey / Patta No.", farm.ownership?.patta)}
                                    {row("Total Ponds", farm.totalPonds)}
                                </div>
                            </div>

                            {/* Infrastructure */}
                            <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm mb-3">
                                <p className="text-[9px] uppercase font-black tracking-[0.18em] mb-3 text-amber-600">Infrastructure</p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(farm.infrastructure || {}).map(([key, val]) =>
                                        val ? (
                                            <span key={key} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 border border-amber-100 text-amber-700 capitalize">
                                                {key.replace(/([A-Z])/g, ' $1')}
                                            </span>
                                        ) : null
                                    )}
                                </div>
                            </div>

                            {/* Ponds */}
                            <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <Droplets size={14} className="text-teal-500" />
                                    <p className="text-[9px] uppercase font-black tracking-[0.18em] text-teal-600">Ponds</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {Array.from({ length: farm.totalPonds || 0 }, (_, i) => (
                                        <span key={i} className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-teal-50 border border-teal-100 text-teal-700">
                                            Pond {i + 1}
                                        </span>
                                    ))}
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
