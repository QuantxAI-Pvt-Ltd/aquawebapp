import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, User, FileText, X } from "lucide-react";
import axios from "@/lib/api";
import BottomNav from "@/components/BottomNav";
import { resolveMediaUrl } from "@/lib/fileUtils";

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
    const [previewDoc, setPreviewDoc] = useState<string | null>(null);

    useEffect(() => {
        const session = JSON.parse(localStorage.getItem("aqua-session") || "{}");
        if (!session.farmerId) { navigate("/login", { replace: true }); return; }
        axios.get(`/api/farmers/${session.farmerId}`)
            .then(r => setFarmer(r.data.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-[100dvh] bg-stone-50 pb-[calc(7rem+env(safe-area-inset-bottom,0px))]" style={{ fontFamily: "'Sora', sans-serif" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

            {/* Header */}
            <div className="px-5 pt-8 pb-7 rounded-b-[2.5rem] relative overflow-hidden"
                style={{ background: "linear-gradient(140deg,#1c4a3e 0%,#1c6b5a 45%,#2d9b7f 100%)", boxShadow: "0 8px 32px -6px rgba(28,74,62,0.28)" }}>
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/dashboard")}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all touch-manipulation">
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
                    <div>

                        {/* Avatar */}
                        {(() => {
                            const photoUrl = resolveMediaUrl(farmer.identity?.photo);
                            return (
                                <div className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-stone-100 shadow-sm mb-4">
                                    {photoUrl ? (
                                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-amber-100 shrink-0 shadow-xs cursor-pointer" onClick={() => setPreviewDoc(photoUrl)}>
                                            <img
                                                src={photoUrl}
                                                alt={farmer.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                                            <User size={24} className="text-amber-500" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-base font-bold text-stone-800">{farmer.name}</p>
                                        <p className="text-xs text-stone-400">{farmer.phone}</p>
                                    </div>
                                </div>
                            );
                        })()}

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
                        <Section title="Identity & KYC Documents" accent="#a67030">
                            {row("Aadhar Number", farmer.identity?.aadharNumber)}
                            {row("PAN Number", farmer.identity?.panNumber)}
                            {farmer.identity?.aadharFile && (() => {
                                const url = resolveMediaUrl(farmer.identity.aadharFile);
                                return url ? (
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-[9px] uppercase font-bold tracking-[0.14em] text-stone-400">Aadhaar Doc</p>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDoc(url)}
                                            className="text-xs text-amber-700 font-bold flex items-center gap-1 hover:underline"
                                        >
                                            <FileText size={12} />
                                            <span>View Aadhaar</span>
                                        </button>
                                    </div>
                                ) : null;
                            })()}
                            {farmer.identity?.panFile && (() => {
                                const url = resolveMediaUrl(farmer.identity.panFile);
                                return url ? (
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-[9px] uppercase font-bold tracking-[0.14em] text-stone-400">PAN Doc</p>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDoc(url)}
                                            className="text-xs text-amber-700 font-bold flex items-center gap-1 hover:underline"
                                        >
                                            <FileText size={12} />
                                            <span>View PAN</span>
                                        </button>
                                    </div>
                                ) : null;
                            })()}
                            {farmer.registration?.regCertificate && (() => {
                                const url = resolveMediaUrl(farmer.registration.regCertificate);
                                return url ? (
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-[9px] uppercase font-bold tracking-[0.14em] text-stone-400">Reg Certificate</p>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDoc(url)}
                                            className="text-xs text-amber-700 font-bold flex items-center gap-1 hover:underline"
                                        >
                                            <FileText size={12} />
                                            <span>View Certificate</span>
                                        </button>
                                    </div>
                                ) : null;
                            })()}
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

                    </div>
                )}
            </div>

            {/* Document / Photo Preview Modal */}
            {previewDoc && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
                    onClick={() => setPreviewDoc(null)}
                >
                    <div className="relative max-w-xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl bg-black">
                        <button
                            onClick={() => setPreviewDoc(null)}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black z-10"
                        >
                            <X size={18} />
                        </button>
                        <img src={previewDoc} alt="Document" className="max-h-[80vh] w-auto object-contain mx-auto" />
                    </div>
                </div>
            )}

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

