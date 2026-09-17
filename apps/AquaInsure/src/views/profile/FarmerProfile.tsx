import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ChevronLeft, User } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";

const EASE = [0.16, 1, 0.3, 1] as const;

const row = (label: string, value: any) =>
    value ? (
        <div className="flex flex-col gap-0.5">
            <p className="text-[9px] uppercase font-bold tracking-[0.14em] text-stone-400">{label}</p>
            <p className="text-sm font-semibold text-stone-700">{String(value)}</p>
        </div>
    ) : null;

export default function FarmerProfile() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [farmer, setFarmer] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const session = JSON.parse(localStorage.getItem("aqua-session") || "{}");
        if (!session.farmerId) { navigate("/login", { replace: true }); return; }
        axios.get(`/api/farmers/${session.farmerId}`)
            .then(r => setFarmer(r.data.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-stone-50 pb-28" style={{ fontFamily: "'Sora', sans-serif" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

            {/* Header */}
            <div className="px-5 pt-8 pb-7 rounded-b-[2.5rem] relative overflow-hidden"
                style={{ background: "linear-gradient(140deg,#1c4a3e 0%,#1c6b5a 45%,#2d9b7f 100%)", boxShadow: "0 8px 32px -6px rgba(28,74,62,0.28)" }}>
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/dashboard")}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-lg font-bold text-white tracking-tight">{t("dashboard.farmer")}</h1>
                    </div>
                    <span className="text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15">
                        Aqua <span className="text-amber-300">AI</span>nsure
                    </span>
                </div>
            </div>

            <div className="px-4 mt-5 space-y-4">
                {loading ? (
                    <p className="text-center text-sm text-stone-400 pt-10">Loading...</p>
                ) : !farmer ? (
                    <p className="text-center text-sm text-stone-400 pt-10">No profile found.</p>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE, duration: 0.5 }}>

                        {/* Avatar */}
                        <div className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-stone-100 shadow-sm mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                                <User size={24} className="text-amber-500" />
                            </div>
                            <div>
                                <p className="text-base font-bold text-stone-800">{farmer.name}</p>
                                <p className="text-xs text-stone-400">{farmer.phone}</p>
                            </div>
                        </div>

                        {/* Basic */}
                        <Section title="Basic Details" accent="#b5813a">
                            {row("Father's Name", farmer.fatherName)}
                            {row("Gender", farmer.gender)}
                            {row("Date of Birth", farmer.dob)}
                            {row("Community", farmer.community)}
                            {row("SC / ST", farmer.isScSt ? "Yes" : undefined)}
                        </Section>

                        {/* Address */}
                        <Section title="Address" accent="#2d9b7f">
                            {row("Village", farmer.address?.village)}
                            {row("Taluk", farmer.address?.taluk)}
                            {row("District", farmer.address?.district)}
                            {row("State", farmer.address?.state)}
                            {row("Pin Code", farmer.address?.pinCode)}
                        </Section>

                        {/* Identity */}
                        <Section title="Identity" accent="#a67030">
                            {row("Aadhar Number", farmer.identity?.aadharNumber)}
                            {row("PAN Number", farmer.identity?.panNumber)}
                        </Section>

                        {/* Bank */}
                        <Section title="Bank Details" accent="#1c6b5a">
                            {row("Bank Name", farmer.bankDetails?.bankName)}
                            {row("Branch", farmer.bankDetails?.branch)}
                            {row("Account Type", farmer.bankDetails?.accountType)}
                            {row("Account Number", farmer.bankDetails?.accountNumber)}
                            {row("IFSC Code", farmer.bankDetails?.ifscCode)}
                            {row("Account Holder", farmer.bankDetails?.accountHolderName)}
                        </Section>

                    </motion.div>
                )}
            </div>
            <BottomNav />
        </div>
    );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
    const validChildren = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
    if (validChildren.length === 0) return null;
    return (
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm mb-3">
            <p className="text-[9px] uppercase font-black tracking-[0.18em] mb-3" style={{ color: accent }}>{title}</p>
            <div className="grid grid-cols-2 gap-3">{children}</div>
        </div>
    );
}
