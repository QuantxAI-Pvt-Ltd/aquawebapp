import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    ChevronLeft,
    ChevronRight,
    Landmark,
    Droplets,
    X,
    ShieldCheck,
    AlertCircle,
    Eye,
    Ruler,
    Layers,
    Calendar,
    Fish,
    FileText,
    ExternalLink
} from "lucide-react";
import axios from "@/lib/api";
import BottomNav from "@/components/BottomNav";
import { resolveMediaUrl } from "@/lib/fileUtils";
import { Button } from "@/components/ui/button";

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
    const [insurances, setInsurances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewModal, setPreviewModal] = useState<{ url: string; title: string } | null>(null);
    const [brokenPhotos, setBrokenPhotos] = useState<Record<string, boolean>>({});
    const [filterTab, setFilterTab] = useState<'all' | 'insured' | 'uninsured'>('all');

    useEffect(() => {
        const session = JSON.parse(localStorage.getItem("aqua-session") || "{}");
        if (!session.farmerId) {
            navigate("/login", { replace: true });
            return;
        }
        const id = session.farmerId;
        Promise.all([
            axios.get(`/api/farms/${id}`),
            axios.get(`/api/farms/ponds?farmerId=${id}`).catch(() => ({ data: { data: [] } })),
            axios.get(`/api/insurances?farmerId=${id}`).catch(() => ({ data: { data: [] } }))
        ])
            .then(([farmRes, pondsRes, insRes]) => {
                setFarms(farmRes.data?.data || []);
                setPonds(pondsRes.data?.data || []);
                setInsurances(insRes.data?.data || []);
            })
            .catch((err) => {
                console.error("Failed to load farm details:", err);
            })
            .finally(() => setLoading(false));
    }, [navigate]);

    // Match policy to pond
    const getPondPolicy = (pond: any) => {
        const pondIdStr = String(pond._id || "");
        return insurances.find((ins) => {
            if (Array.isArray(ins.insuredPondIds) && ins.insuredPondIds.some((pId: any) => String(pId) === pondIdStr)) {
                return true;
            }
            const pId = typeof ins.pondId === "object" && ins.pondId?._id ? String(ins.pondId._id) : String(ins.pondId || "");
            if (pId && pId === pondIdStr) {
                return true;
            }
            if (ins.pondId?.pondNumber && ins.pondId.pondNumber === pond.pondNumber) {
                return true;
            }
            return false;
        });
    };

    // Synthesize & assemble all ponds for a farm
    const getFarmPonds = (farm: any) => {
        const farmIdStr = String(farm._id || "");
        const farmerIdStr = String(farm.farmerId || "");
        const matched = ponds.filter(
            (p) => String(p.farmId || "") === farmIdStr || (farmerIdStr && String(p.farmerId || "") === farmerIdStr)
        );

        const totalExpected = Math.max(farm.totalPonds || 0, matched.length);
        const result: any[] = [];

        for (let i = 1; i <= totalExpected; i++) {
            const existing = matched.find((p) => p.pondNumber === i);
            if (existing) {
                const policy = getPondPolicy(existing);
                result.push({
                    ...existing,
                    policy,
                    isInsured: !!policy,
                });
            } else {
                const synthetic = {
                    _id: `synth-${farmIdStr}-${i}`,
                    farmId: farm._id,
                    farmerId: farm.farmerId,
                    pondNumber: i,
                    name: `Pond ${i}`,
                    dimensionAcres: 1,
                    surveyNumber: farm.ownership?.patta ? `${farm.ownership.patta}/${i}` : "",
                    pattaNumber: farm.ownership?.patta || "",
                    photo: null,
                };
                const policy = getPondPolicy(synthetic);
                result.push({
                    ...synthetic,
                    policy,
                    isInsured: !!policy,
                });
            }
        }

        return result.sort((a, b) => (a.pondNumber || 0) - (b.pondNumber || 0));
    };

    return (
        <div className="h-full min-h-[100dvh] bg-stone-50 overflow-hidden flex flex-col" style={{ fontFamily: "'Sora', sans-serif" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

            {/* SCROLLABLE INNER BODY */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-8">
                {/* Header */}
                <div
                    className="px-5 pt-8 pb-7 rounded-b-[2.5rem] relative overflow-hidden shrink-0"
                    style={{ background: "linear-gradient(140deg,#7c4a1e 0%,#c9922a 55%,#e6a832 100%)", boxShadow: "0 8px 32px -6px rgba(124,74,30,0.28)" }}
                >
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate("/dashboard")}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all touch-manipulation"
                            >
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
                        farms.map((farm, i) => {
                            const farmKey = farm._id || `farm-${i}`;
                            const farmPhotoUrl = resolveMediaUrl(farm.farmPhoto);
                            const hasValidFarmPhoto = farmPhotoUrl && !brokenPhotos[`farm-${farmKey}`];
                            const allFarmPonds = getFarmPonds(farm);
                            const insuredCount = allFarmPonds.filter((p) => p.isInsured).length;
                            const uninsuredCount = allFarmPonds.filter((p) => !p.isInsured).length;
                            const totalAcres = allFarmPonds.reduce((acc, p) => acc + (Number(p.dimensionAcres) || 1), 0);

                            const filteredPonds = allFarmPonds.filter((p) => {
                                if (filterTab === "insured") return p.isInsured;
                                if (filterTab === "uninsured") return !p.isInsured;
                                return true;
                            });

                            return (
                                <div key={farmKey} className="space-y-4">
                                    {/* Farm header card */}
                                    <div className="bg-white rounded-2xl overflow-hidden border border-amber-100 shadow-sm">
                                        {hasValidFarmPhoto && (
                                            <div
                                                className="w-full h-36 relative overflow-hidden cursor-pointer group bg-stone-900"
                                                onClick={() => setPreviewModal({ url: farmPhotoUrl, title: `Farm ${i + 1} Photo` })}
                                            >
                                                <img
                                                    src={farmPhotoUrl}
                                                    alt={`Farm ${i + 1}`}
                                                    onError={() => setBrokenPhotos((prev) => ({ ...prev, [`farm-${farmKey}`]: true }))}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                                <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between text-white">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-md border border-white/10">
                                                        Farm Photo
                                                    </span>
                                                    <span className="text-[10px] flex items-center gap-1 font-semibold bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-md">
                                                        <Eye size={11} /> Tap to preview
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-4 p-4">
                                            {!hasValidFarmPhoto && (
                                                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                                                    <Landmark size={20} className="text-amber-500" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-base font-bold text-stone-800">Farm {i + 1}</p>
                                                <p className="text-xs text-stone-400 truncate">
                                                    {farm.location?.place || "Main Site"}, {farm.location?.district}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location Details */}
                                    <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                                        <p className="text-[9px] uppercase font-black tracking-[0.18em] mb-3 text-amber-600">Location</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {row("Place", farm.location?.place)}
                                            {row("Taluk", farm.location?.taluk)}
                                            {row("District", farm.location?.district)}
                                            {row("Latitude", farm.latitude)}
                                            {row("Longitude", farm.longitude)}
                                        </div>
                                    </div>

                                    {/* Ownership Details */}
                                    <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                                        <p className="text-[9px] uppercase font-black tracking-[0.18em] mb-3 text-amber-600">Ownership</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {row("Type", farm.ownership?.type)}
                                            {row("Survey / Patta No.", farm.ownership?.patta)}
                                            {row("Total Ponds", allFarmPonds.length)}
                                        </div>
                                    </div>

                                    {/* Infrastructure */}
                                    <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                                        <p className="text-[9px] uppercase font-black tracking-[0.18em] mb-3 text-amber-600">Infrastructure</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(farm.infrastructure || {}).map(([key, val]) =>
                                                val ? (
                                                    <span key={key} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 border border-amber-100 text-amber-700 capitalize">
                                                        {key.replace(/([A-Z])/g, " $1")}
                                                    </span>
                                                ) : null
                                            )}
                                        </div>
                                    </div>

                                    {/* ── ALL PONDS & INSURANCE COVERAGE ── */}
                                    <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm space-y-4">
                                        {/* Ponds Section Header & Summary */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <Droplets size={16} className="text-teal-600" />
                                                    <p className="text-[10px] uppercase font-black tracking-[0.18em] text-teal-700">
                                                        Pond Inventory & Coverage
                                                    </p>
                                                </div>
                                                <span className="text-[11px] font-bold text-stone-500">
                                                    {totalAcres.toFixed(1)} Total Acres
                                                </span>
                                            </div>
                                            <p className="text-xs text-stone-400">
                                                Detailed specifications, photos, and insurance status for all farm ponds.
                                            </p>
                                        </div>

                                        {/* Coverage Stats Pills */}
                                        <div className="grid grid-cols-3 gap-2 p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                                            <div className="text-center">
                                                <p className="text-[10px] text-stone-400 font-semibold uppercase">Total</p>
                                                <p className="text-sm font-black text-stone-800">{allFarmPonds.length}</p>
                                            </div>
                                            <div className="text-center border-x border-stone-200/60">
                                                <p className="text-[10px] text-emerald-600 font-semibold uppercase">Insured</p>
                                                <p className="text-sm font-black text-emerald-700">{insuredCount}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] text-amber-600 font-semibold uppercase">Uninsured</p>
                                                <p className="text-sm font-black text-amber-700">{uninsuredCount}</p>
                                            </div>
                                        </div>

                                        {/* Filter Tabs */}
                                        <div className="flex rounded-xl p-1 bg-stone-100 gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setFilterTab("all")}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                                    filterTab === "all" ? "bg-white text-stone-800 shadow-xs" : "text-stone-500 hover:text-stone-700"
                                                }`}
                                            >
                                                All ({allFarmPonds.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFilterTab("insured")}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                                    filterTab === "insured" ? "bg-white text-emerald-700 shadow-xs" : "text-stone-500 hover:text-stone-700"
                                                }`}
                                            >
                                                Insured ({insuredCount})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFilterTab("uninsured")}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                                    filterTab === "uninsured" ? "bg-white text-amber-700 shadow-xs" : "text-stone-500 hover:text-stone-700"
                                                }`}
                                            >
                                                Uninsured ({uninsuredCount})
                                            </button>
                                        </div>

                                        {/* Detailed Pond Cards */}
                                        <div className="space-y-3.5 pt-1">
                                            {filteredPonds.length === 0 ? (
                                                <div className="p-6 text-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                                                    No {filterTab} ponds found.
                                                </div>
                                            ) : (
                                                filteredPonds.map((pond) => {
                                                    const pondPhotoUrl = resolveMediaUrl(pond.photo);
                                                    const pondKey = `pond-${pond._id || pond.pondNumber}`;
                                                    const hasValidPondPhoto = pondPhotoUrl && !brokenPhotos[pondKey];
                                                    const policy = pond.policy;

                                                    return (
                                                        <div
                                                            key={pondKey}
                                                            className={`rounded-2xl border transition-all overflow-hidden ${
                                                                pond.isInsured
                                                                    ? "border-teal-200/80 bg-white shadow-xs"
                                                                    : "border-stone-200/90 bg-stone-50/40 shadow-xs"
                                                            }`}
                                                        >
                                                            {/* Pond Photo Banner / Preview */}
                                                            {hasValidPondPhoto ? (
                                                                <div
                                                                    className="relative w-full h-36 bg-stone-900 overflow-hidden cursor-pointer group"
                                                                    onClick={() => setPreviewModal({ url: pondPhotoUrl, title: `${pond.name} Photo` })}
                                                                    title="Click to preview pond photo"
                                                                >
                                                                    <img
                                                                        src={pondPhotoUrl}
                                                                        alt={pond.name}
                                                                        onError={() => setBrokenPhotos((prev) => ({ ...prev, [pondKey]: true }))}
                                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                    />
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                                                    <div className="absolute top-2.5 right-2.5">
                                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-white backdrop-blur-sm border border-white/20 flex items-center gap-1">
                                                                            <Eye size={10} /> Preview
                                                                        </span>
                                                                    </div>
                                                                    <div className="absolute bottom-2.5 left-3 text-white">
                                                                        <span className="text-[10px] font-bold tracking-wide uppercase bg-teal-900/60 backdrop-blur-sm px-2 py-0.5 rounded-md">
                                                                            {pond.name}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="px-4 pt-3.5 pb-1 flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                                                                            <Droplets size={16} />
                                                                        </div>
                                                                        <span className="text-sm font-bold text-stone-800">{pond.name}</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="p-4 space-y-3">
                                                                {/* Top Pond Title & Status Badge */}
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div>
                                                                        <p className="text-sm font-bold text-stone-800">{pond.name}</p>
                                                                        <p className="text-[11px] text-stone-400">Pond #{pond.pondNumber}</p>
                                                                    </div>
                                                                    {pond.isInsured ? (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                                                            <ShieldCheck size={12} className="text-emerald-600" />
                                                                            Insured
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                                                            <AlertCircle size={12} className="text-amber-600" />
                                                                            Not Insured
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Specifications Grid */}
                                                                <div className="grid grid-cols-2 gap-2.5 p-3 bg-stone-50/80 rounded-xl border border-stone-100 text-xs">
                                                                    <div className="space-y-0.5">
                                                                        <p className="text-[9px] uppercase font-bold tracking-wider text-stone-400 flex items-center gap-1">
                                                                            <Ruler size={10} className="text-teal-600" /> Pond Size
                                                                        </p>
                                                                        <p className="text-xs font-bold text-stone-700">
                                                                            {pond.dimensionAcres ? `${pond.dimensionAcres} Acres` : "1.0 Acre"}
                                                                        </p>
                                                                    </div>

                                                                    <div className="space-y-0.5">
                                                                        <p className="text-[9px] uppercase font-bold tracking-wider text-stone-400">
                                                                            Survey Number
                                                                        </p>
                                                                        <p className="text-xs font-bold text-stone-700 truncate">
                                                                            {pond.surveyNumber || "N/A"}
                                                                        </p>
                                                                    </div>

                                                                    <div className="space-y-0.5">
                                                                        <p className="text-[9px] uppercase font-bold tracking-wider text-stone-400">
                                                                            Patta Number
                                                                        </p>
                                                                        <p className="text-xs font-bold text-stone-700 truncate">
                                                                            {pond.pattaNumber || farm.ownership?.patta || "N/A"}
                                                                        </p>
                                                                    </div>

                                                                    <div className="space-y-0.5">
                                                                        <p className="text-[9px] uppercase font-bold tracking-wider text-stone-400">
                                                                            Location
                                                                        </p>
                                                                        <p className="text-xs font-bold text-stone-700 truncate">
                                                                            {pond.address?.village || farm.location?.place || farm.location?.district || "Farm Site"}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Insurance Details Section */}
                                                                {pond.isInsured && policy ? (
                                                                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 space-y-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                                                                                <ShieldCheck size={12} className="text-emerald-600" />
                                                                                Active Policy Details
                                                                            </span>
                                                                            <span className="text-[10px] font-semibold text-emerald-700">
                                                                                ID: {String(policy._id || "").slice(-6).toUpperCase()}
                                                                            </span>
                                                                        </div>

                                                                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                                                                            <div>
                                                                                <p className="text-[9px] text-emerald-700/80 font-medium uppercase">Species</p>
                                                                                <p className="font-bold text-emerald-900 capitalize">
                                                                                    {policy.species === "vannamei"
                                                                                        ? "L. Vannamei"
                                                                                        : policy.species === "tiger"
                                                                                        ? "Tiger Shrimp"
                                                                                        : policy.species || "Shrimp"}
                                                                                </p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[9px] text-emerald-700/80 font-medium uppercase">Density</p>
                                                                                <p className="font-bold text-emerald-900">
                                                                                    {policy.stockingDensity || 40} PL/m²
                                                                                </p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[9px] text-emerald-700/80 font-medium uppercase">Coverage</p>
                                                                                <p className="font-bold text-emerald-900">
                                                                                    {policy.insurancePeriodDays || 120} Days
                                                                                </p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[9px] text-emerald-700/80 font-medium uppercase">Harvest Window</p>
                                                                                <p className="font-bold text-emerald-900">
                                                                                    {policy.plannedHarvestDate
                                                                                        ? new Date(policy.plannedHarvestDate).toLocaleDateString("en-IN", {
                                                                                              day: "numeric",
                                                                                              month: "short",
                                                                                              year: "numeric",
                                                                                          })
                                                                                        : "Scheduled"}
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => navigate("/insurance-detail")}
                                                                            className="w-full mt-1 pt-1.5 border-t border-emerald-200/60 text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center justify-between transition-colors"
                                                                        >
                                                                            <span>View Full Insurance Policy</span>
                                                                            <ChevronRight size={13} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl p-3 space-y-2">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <AlertCircle size={13} className="text-amber-600" />
                                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                                                                Pond Not Insured
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[11px] text-amber-900/80 leading-snug">
                                                                            This pond is currently uninsured against catastrophic mortality and disease outbreaks.
                                                                        </p>
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            onClick={() => navigate("/insurance-registration?mode=edit")}
                                                                            className="w-full h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs"
                                                                        >
                                                                            Insure This Pond →
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Photo Zoom / Lightbox Preview Modal */}
            {previewModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setPreviewModal(null)}
                >
                    <div
                        className="relative max-w-lg w-full bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 z-[101]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-black/50">
                            <div className="flex items-center gap-2">
                                <Eye size={15} className="text-teal-400" />
                                <span className="text-xs font-semibold tracking-wide text-white/90">
                                    {previewModal.title}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewModal(null)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-4 flex items-center justify-center bg-stone-950/80 max-h-[75vh] overflow-hidden">
                            <img
                                src={previewModal.url}
                                alt={previewModal.title}
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

