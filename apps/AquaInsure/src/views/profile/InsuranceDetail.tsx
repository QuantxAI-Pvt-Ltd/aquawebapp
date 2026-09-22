import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    ChevronLeft,
    ShieldCheck,
    ShieldAlert,
    Clock,
    CheckCircle2,
    XCircle,
    Camera,
    X,
    Waves,
    ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import axios from "@/lib/api";
import BottomNav from "@/components/BottomNav";
import { fileToBase64, uploadToSeaweedFS, resolveMediaUrl } from "@/lib/fileUtils";

const EASE = [0.16, 1, 0.3, 1] as const;

interface PolicyItem {
    _id: string;
    species: string;
    insuranceType: string;
    stockingDate?: string;
    stockingDensity?: number;
    insurancePeriodDays?: number;
    plannedHarvestDate?: string;
    maxHarvestDate?: string;
    status: string;
    pondId?: { _id: string; name: string; pondNumber?: number };
    farmId?: { _id: string; name: string };
    claim?: {
        claimedAt?: string;
        reason?: string;
        description?: string;
        estimatedLossPercent?: number;
        status?: string;
        reviewerNotes?: string;
        settlementAmount?: number;
        evidencePhoto?: any;
    };
}

const row = (label: string, value: unknown) =>
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
    const [policies, setPolicies] = useState<PolicyItem[]>([]);
    const [claims, setClaims] = useState<PolicyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"policies" | "claims">("policies");

    // Modal state for filing claim directly from policy card
    const [activeClaimPolicy, setActiveClaimPolicy] = useState<PolicyItem | null>(null);
    const [reason, setReason] = useState("mass_mortality");
    const [lossPercent, setLossPercent] = useState(50);
    const [description, setDescription] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [farmerId, setFarmerId] = useState("");

    const fetchData = async (fId: string) => {
        try {
            setLoading(true);
            const [pRes, cRes] = await Promise.all([
                axios.get(`/api/insurances?farmerId=${fId}`),
                axios.get(`/api/insurances/claims?farmerId=${fId}`)
            ]);
            setPolicies(pRes.data.data || []);
            setClaims(cRes.data.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const session = JSON.parse(localStorage.getItem("aqua-session") || "{}");
        if (!session.farmerId) { navigate("/login", { replace: true }); return; }
        setFarmerId(session.farmerId);
        fetchData(session.farmerId);
    }, [navigate]);

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const url = URL.createObjectURL(file);
            setPhotoPreview(url);
        }
    };

    const handleFileClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeClaimPolicy) return;

        try {
            setSubmitting(true);
            toast.loading("Submitting insurance claim...", { id: "detail-claim-save" });

            let evidencePhotoUrl: string | null = null;
            if (photoFile) {
                const uploaded = await uploadToSeaweedFS(photoFile, `farmers/${farmerId}/claims`);
                evidencePhotoUrl = uploaded?.key || uploaded?.url || null;
            } else if (photoPreview) {
                evidencePhotoUrl = photoPreview;
            }

            const res = await axios.post(`/api/insurances/${activeClaimPolicy._id}/claim`, {
                reason,
                description,
                estimatedLossPercent: lossPercent,
                evidencePhoto: evidencePhotoUrl
            });

            if (res.data.success) {
                toast.dismiss("detail-claim-save");
                toast.success("Claim filed successfully and is under review.");
                setActiveClaimPolicy(null);
                setDescription("");
                setPhotoFile(null);
                setPhotoPreview(null);
                setLossPercent(50);
                await fetchData(farmerId);
                setViewMode("claims");
            }
        } catch (err: unknown) {
            toast.dismiss("detail-claim-save");
            const msg = axios.isAxiosError(err) ? err.response?.data?.error : (err as Error).message;
            toast.error(msg || "Failed to submit claim. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const statusColor = (s: string) => {
        if (s === "active") return "#2d9b7f";
        if (s === "expired") return "#ef4444";
        if (s === "claim_pending") return "#d97706";
        if (s === "claim_approved" || s === "claimed") return "#059669";
        if (s === "claim_rejected") return "#dc2626";
        return "#b5813a";
    };

    return (
        <div className="min-h-[100dvh] bg-stone-50 pb-0 overflow-x-clip flex flex-col" style={{ fontFamily: "'Sora', sans-serif" }}>
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
                        <h1 className="text-lg font-bold text-white tracking-tight">{t("dashboard.insurance")}</h1>
                    </div>
                    <span className="text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15">
                        Aqua <span className="text-amber-300">AI</span>nsure
                    </span>
                </div>
            </div>

            <div className="px-4 mt-4">
                {/* Segment Switcher: Policies vs Claims */}
                <div className="flex bg-stone-200/70 p-1 rounded-xl mb-4 text-xs font-semibold text-stone-600">
                    <button
                        onClick={() => setViewMode("policies")}
                        className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            viewMode === "policies" ? "bg-white text-teal-800 shadow-sm font-bold" : "text-stone-500 hover:text-stone-800"
                        }`}
                    >
                        <ShieldCheck size={14} />
                        <span>Registered Policies ({policies.length})</span>
                    </button>
                    <button
                        onClick={() => setViewMode("claims")}
                        className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            viewMode === "claims" ? "bg-white text-teal-800 shadow-sm font-bold" : "text-stone-500 hover:text-stone-800"
                        }`}
                    >
                        <ShieldAlert size={14} />
                        <span>Claims History ({claims.length})</span>
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-stone-400">
                        <Clock className="w-8 h-8 animate-spin text-teal-600 mb-2" />
                        <p className="text-sm">Loading coverage details...</p>
                    </div>
                ) : viewMode === "policies" ? (
                    /* POLICIES VIEW */
                    policies.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 border border-stone-100 text-center shadow-sm">
                            <p className="text-sm text-stone-500 mb-3">No insurance policies found for your ponds.</p>
                            <button
                                onClick={() => navigate("/insurance-registration")}
                                className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-xl"
                            >
                                Register Policy
                            </button>
                        </div>
                    ) : (
                        policies.map((policy, i) => {
                            const isClaimed = ["claim_pending", "claim_approved", "claim_rejected", "claimed"].includes(policy.status);
                            const canClaim = policy.status === "active";

                            return (
                                <div>

                                    {/* Policy header */}
                                    <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-stone-100 shadow-sm mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                                                <ShieldCheck size={18} className="text-teal-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-stone-800 capitalize">
                                                    {policy.pondId?.name ? `${policy.pondId.name} Â· ` : ""}
                                                    {policy.insuranceType} Policy
                                                </p>
                                                <p className="text-xs text-stone-400">{policy.species}</p>
                                            </div>
                                        </div>
                                        {badge(
                                            policy.status === "claim_pending" ? "Claim Pending" :
                                            policy.status === "claim_approved" ? "Claim Approved" :
                                            policy.status === "claim_rejected" ? "Claim Rejected" :
                                            policy.status || "active",
                                            statusColor(policy.status || "active")
                                        )}
                                    </div>

                                    {/* Culture Details */}
                                    <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm mb-3">
                                        <p className="text-[9px] uppercase font-black tracking-[0.18em] mb-3 text-teal-600">Culture Details</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {row("Stocking Date", policy.stockingDate ? new Date(policy.stockingDate).toLocaleDateString() : null)}
                                            {row("Stocking Density", policy.stockingDensity ? `${policy.stockingDensity} PL/mÂ²` : null)}
                                            {row("Species", policy.species)}
                                            {row("Duration", policy.insurancePeriodDays ? `${policy.insurancePeriodDays} days` : null)}
                                        </div>
                                    </div>

                                    {/* Harvest Plan */}
                                    <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm mb-3">
                                        <p className="text-[9px] uppercase font-black tracking-[0.18em] mb-3 text-teal-600">Harvest Plan</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {row("Planned Harvest", policy.plannedHarvestDate ? new Date(policy.plannedHarvestDate).toLocaleDateString() : null)}
                                            {row("Max Harvest Date", policy.maxHarvestDate ? new Date(policy.maxHarvestDate).toLocaleDateString() : null)}
                                        </div>
                                    </div>

                                    {/* Claim Action Bar */}
                                    <div className="bg-white rounded-2xl p-3.5 border border-stone-100 shadow-sm flex items-center justify-between">
                                        {canClaim ? (
                                            <div className="w-full flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-stone-800">Crop mortality or disease?</p>
                                                    <p className="text-[11px] text-stone-400">File claim on this active plan</p>
                                                </div>
                                                <button
                                                    onClick={() => setActiveClaimPolicy(policy)}
                                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-sm"
                                                >
                                                    <ShieldAlert size={14} />
                                                    <span>File Claim</span>
                                                </button>
                                            </div>
                                        ) : isClaimed ? (
                                            <div className="w-full flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {policy.status === "claim_approved" ? (
                                                        <CheckCircle2 size={16} className="text-emerald-600" />
                                                    ) : (
                                                        <Clock size={16} className="text-amber-600" />
                                                    )}
                                                    <p className="text-xs font-semibold text-stone-700">
                                                        {policy.status === "claim_approved" ? "Claim Settled" : "Claim under review"}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setViewMode("claims")}
                                                    className="flex items-center gap-1 text-xs text-teal-700 font-bold hover:underline"
                                                >
                                                    <span>View Claim</span>
                                                    <ArrowRight size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-stone-400">Policy expired on {policy.maxHarvestDate ? new Date(policy.maxHarvestDate).toLocaleDateString() : 'term'}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )
                ) : (
                    /* CLAIMS VIEW */
                    claims.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 border border-stone-100 text-center shadow-sm">
                            <p className="text-sm text-stone-500 mb-2">No claims filed yet.</p>
                            <p className="text-xs text-stone-400">If your shrimp crop experiences unexpected mortality or disease, you can file a claim against your active policies above.</p>
                        </div>
                    ) : (
                        claims.map((item, idx) => {
                            const c = item.claim;
                            const isApproved = c?.status === "approved";
                            const isRejected = c?.status === "rejected";

                            return (
                                <div>
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="text-sm font-bold text-stone-800">
                                                {item.pondId?.name || `Pond ${item.pondId?.pondNumber || ''}`}
                                            </h4>
                                            <p className="text-[11px] text-stone-400">{item.species} Â· {item.insuranceType} Policy</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                                            isApproved ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                            isRejected ? "bg-rose-50 text-rose-700 border border-rose-200" :
                                            "bg-amber-50 text-amber-700 border border-amber-200"
                                        }`}>
                                            {isApproved ? "Approved" : isRejected ? "Rejected" : "Under Review"}
                                        </span>
                                    </div>

                                    <div className="bg-stone-50 rounded-xl p-2.5 text-xs grid grid-cols-2 gap-2 mb-2">
                                        <div>
                                            <span className="text-[9px] uppercase font-bold text-stone-400 block">Cause</span>
                                            <span className="font-semibold text-stone-800 capitalize">{(c?.reason || '').replace('_', ' ')}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] uppercase font-bold text-stone-400 block">Estimated Loss</span>
                                            <span className="font-bold text-rose-600">{c?.estimatedLossPercent || 0}%</span>
                                        </div>
                                    </div>

                                    {isApproved && (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs font-bold text-emerald-800 mb-2">
                                            <span>Approved Settlement</span>
                                            <span className="text-sm">â‚¹{Number(c?.settlementAmount || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}

                                    {c?.reviewerNotes && (
                                        <div className="text-xs bg-stone-50 p-2 rounded-lg border border-stone-100 text-stone-600">
                                            <span className="font-bold text-stone-700">Inspector Remark: </span>
                                            {c.reviewerNotes}
                                        </div>
                                    )}

                                    {c?.evidencePhoto && (() => {
                                        const evUrl = resolveMediaUrl(c.evidencePhoto);
                                        return evUrl ? (
                                            <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                                                <span className="text-[11px] font-semibold text-stone-600">Incident Evidence</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewImage(evUrl)}
                                                    className="text-xs text-teal-700 font-bold hover:underline"
                                                >
                                                    View Photo
                                                </button>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            );
                        })
                    )
                )}
            </div>

            {/* Quick Claim Modal */}
            
                {activeClaimPolicy && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                                        <ShieldAlert size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-stone-800">File Insurance Claim</h3>
                                        <p className="text-[11px] text-stone-400">
                                            {activeClaimPolicy.pondId?.name || `Pond ${activeClaimPolicy.pondId?.pondNumber || ''}`} Â· {activeClaimPolicy.species}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setActiveClaimPolicy(null)}
                                    className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center hover:bg-stone-200"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleFileClaim} className="space-y-4">
                                <div>
                                    <label className="text-[11px] uppercase font-bold text-stone-500 tracking-wider block mb-1.5">
                                        Primary Cause of Loss
                                    </label>
                                    <select
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-full text-base sm:text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-teal-600"
                                    >
                                        <option value="mass_mortality">Sudden Mass Mortality</option>
                                        <option value="disease_outbreak">Disease Outbreak (WSSV / EHP / EMS)</option>
                                        <option value="water_toxicity">Water Quality Crash / Toxic Spike</option>
                                        <option value="flooding_calamity">Flooding / Heavy Storm Influx</option>
                                        <option value="other">Other Accidental Loss</option>
                                    </select>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[11px] uppercase font-bold text-stone-500 tracking-wider">
                                            Estimated Crop Loss
                                        </label>
                                        <span className="text-xs font-extrabold text-teal-700">{lossPercent}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="100"
                                        step="5"
                                        value={lossPercent}
                                        onChange={(e) => setLossPercent(Number(e.target.value))}
                                        className="w-full accent-teal-600"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] uppercase font-bold text-stone-500 tracking-wider block mb-1.5">
                                        Observations / Symptoms
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe what symptoms you observed in the pond..."
                                        className="w-full text-base sm:text-xs bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-teal-600"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] uppercase font-bold text-stone-500 tracking-wider block mb-1.5">
                                        Photo Evidence
                                    </label>
                                    {photoPreview ? (
                                        <div className="relative rounded-xl overflow-hidden border border-stone-200 h-32 bg-stone-100 flex items-center justify-center">
                                            <img src={resolveMediaUrl(photoPreview) || photoPreview} alt="Evidence" className="h-full w-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setPhotoPreview(null)}
                                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center gap-1.5 p-4 border-2 border-dashed border-stone-300 rounded-xl bg-stone-50 hover:bg-stone-100 cursor-pointer transition touch-manipulation">
                                            <Camera size={22} className="text-teal-600" />
                                            <span className="text-xs font-semibold text-stone-700">Upload Evidence Photo</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={handlePhotoSelect}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation"
                                    >
                                        {submitting ? (
                                            <>
                                                <Clock size={16} className="animate-spin" />
                                                <span>Submitting Claim...</span>
                                            </>
                                        ) : (
                                            <span>Submit Claim for Inspection</span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            

            {/* Image Zoom Preview Modal */}
            
                {previewImage && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
                        onClick={() => setPreviewImage(null)}
                    >
                        <div className="relative max-w-xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl bg-black">
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black z-10"
                            >
                                <X size={18} />
                            </button>
                            <img src={resolveMediaUrl(previewImage) || previewImage} alt="Evidence" className="max-h-[80vh] w-auto object-contain mx-auto" />
                        </div>
                    </div>
                )}
            

            <BottomNav />
        </div>
    );
}

