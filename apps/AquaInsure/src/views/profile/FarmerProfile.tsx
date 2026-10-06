import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, User, FileText, X, Eye } from "lucide-react";
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
    const [avatarImgError, setAvatarImgError] = useState(false);
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
        <div className="h-full min-h-[100dvh] bg-stone-50 overflow-hidden flex flex-col" style={{ fontFamily: "'Sora', sans-serif" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

            {/* SCROLLABLE INNER BODY */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-8">
                {/* Header */}
                <div className="px-5 pt-8 pb-7 rounded-b-[2.5rem] relative overflow-hidden shrink-0"
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
                                    {photoUrl && !avatarImgError ? (
                                        <div
                                            className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-200/80 shrink-0 shadow-xs cursor-pointer group transition-all duration-200 hover:ring-2 hover:ring-amber-400/60 active:scale-95 bg-stone-100"
                                            onClick={() => setPreviewDoc(photoUrl)}
                                            title="Click to preview photo"
                                        >
                                            <img
                                                src={photoUrl}
                                                alt={farmer.name}
                                                onError={() => setAvatarImgError(true)}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Eye size={18} className="text-white drop-shadow" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center shrink-0 shadow-xs">
                                            <User size={26} className="text-amber-500" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-bold text-stone-800 truncate">{farmer.name}</p>
                                        <p className="text-xs text-stone-400 font-medium">{farmer.phone}</p>
                                        {photoUrl && !avatarImgError && (
                                            <button
                                                type="button"
                                                onClick={() => setPreviewDoc(photoUrl)}
                                                className="mt-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 transition-colors"
                                            >
                                                <Eye size={12} />
                                                <span>Preview Photo</span>
                                            </button>
                                        )}
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
            </div>

            {/* Document / Photo Preview Modal */}
            {previewDoc && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => setPreviewDoc(null)}
                >
                    <div
                        className="relative max-w-lg w-full bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 z-[101]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-black/40">
                            <div className="flex items-center gap-2">
                                <Eye size={15} className="text-amber-400" />
                                <span className="text-xs font-semibold tracking-wide text-white/90">Preview</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewDoc(null)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-4 flex items-center justify-center bg-stone-950/80 max-h-[75vh] overflow-hidden">
                            <img
                                src={previewDoc}
                                alt="Document preview"
                                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
                            />
                        </div>
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

