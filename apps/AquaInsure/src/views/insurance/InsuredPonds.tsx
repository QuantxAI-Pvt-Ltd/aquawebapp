import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Camera,
  Upload,
  Waves,
  X,
  Loader2,
  ChevronLeft,
  ShieldCheck,
  MapPin,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import SyncIndicator from "@/components/SyncIndicator";
import RegistrationHeader from "@/components/RegistrationHeader";
import { useAutoSave } from "@/hooks/useAutoSave";
import CameraCapture from "@/components/CameraCapture";
import axios from "@/lib/api";
import { uploadToSeaweedFS, resolveMediaUrl } from "@/lib/fileUtils";
import { format } from "date-fns";

interface PondDetail {
  pondId: string;
  pondNumber: number;
  dimensionAcres: string;
  photo: File | null;
  photoPreview: string | null;
  village: string;
  taluk: string;
  district: string;
  state: string;
  pinCode: string;
}

export default function InsuredPonds() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get("mode");
  const viewParam = searchParams.get("view");
  const isEditMode = modeParam === "edit";
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [cameraOpenFor, setCameraOpenFor] = useState<string | null>(null);

  // Read-only state for dashboard
  const [policies, setPolicies] = useState<any[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const isRegistrationComplete =
    typeof window !== "undefined" && localStorage.getItem("aqua-reg-complete") === "1";
  const isReadOnly = viewParam === "readonly" || (!isEditMode && isRegistrationComplete);

  // Load farm & ponds from database or localStorage
  const [farmId, setFarmId] = useState<string>(() => {
    try {
      const fd = JSON.parse(localStorage.getItem("aqua-farm") || "{}");
      return fd.farmId || "";
    } catch {
      return "";
    }
  });

  const [allPondsList, setAllPondsList] = useState<any[]>(() => {
    try {
      const fd = JSON.parse(localStorage.getItem("aqua-farm") || "{}");
      return fd.ponds && fd.ponds.length > 0
        ? fd.ponds
        : [{ pondId: "pond-1", pondNumber: 1, dimensionAcres: 1.0 }];
    } catch {
      return [{ pondId: "pond-1", pondNumber: 1, dimensionAcres: 1.0 }];
    }
  });

  const [selectedPonds, setSelectedPonds] = useState<string[]>(() =>
    allPondsList.map((p: any, i: number) => p._id || p.pondId || `pond-${i + 1}`)
  );

  const [pondDetails, setPondDetails] = useState<Record<string, PondDetail>>(() => {
    let draft: Record<string, any> | null = null;
    try {
      const draftStr = localStorage.getItem("draft_insured_ponds");
      if (draftStr) draft = JSON.parse(draftStr);
    } catch (e) {}

    const init: Record<string, PondDetail> = {};
    allPondsList.forEach((p: any, i: number) => {
      const id = p._id || p.pondId || `pond-${i + 1}`;
      const draftDetail = draft ? draft[id] : null;

      init[id] = {
        pondId: id,
        pondNumber: p.pondNumber || i + 1,
        dimensionAcres: draftDetail?.dimensionAcres ?? (p.dimensionAcres ? String(p.dimensionAcres) : "1.0"),
        photo: null,
        photoPreview: draftDetail?.photoPreview ?? (p.photo ? resolveMediaUrl(p.photo) : null),
        village: draftDetail?.village ?? p.address?.village ?? "",
        taluk: draftDetail?.taluk ?? p.address?.taluk ?? "",
        district: draftDetail?.district ?? p.address?.district ?? "",
        state: draftDetail?.state ?? p.address?.state ?? "",
        pinCode: draftDetail?.pinCode ?? p.address?.pinCode ?? "",
      };
    });
    return init;
  });

  // DB as Single Source of Truth: Fetch live farm, ponds, and policies from MongoDB on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const sessStr = localStorage.getItem("aqua-session");
      const sess = sessStr ? JSON.parse(sessStr) : null;
      if (!sess?.token || !sess?.farmerId) {
        const hasLang = !!localStorage.getItem("shrimpguard-lang");
        navigate(hasLang ? "/login" : "/language", { replace: true });
        return;
      }
      if (sess.farmerId) {
        // 1. Hydrate farm ID
        axios
          .get(`/api/farms/${sess.farmerId}`)
          .then((fRes) => {
            if (fRes.data?.success && Array.isArray(fRes.data?.data) && fRes.data.data.length > 0) {
              const farm = fRes.data.data[0];
              setFarmId(farm._id);
            }
          })
          .catch(() => {});

        // 2. Hydrate ponds list from DB
        axios
          .get(`/api/farms/ponds?farmerId=${sess.farmerId}`)
          .then((pRes) => {
            if (pRes.data?.success && Array.isArray(pRes.data?.data) && pRes.data.data.length > 0) {
              const livePonds = pRes.data.data;
              setAllPondsList(livePonds);
              setSelectedPonds(livePonds.map((p: any) => p._id || `pond-${p.pondNumber}`));

              setPondDetails((prev) => {
                const updated = { ...prev };
                livePonds.forEach((p: any) => {
                  const id = p._id || `pond-${p.pondNumber}`;
                  updated[id] = {
                    pondId: id,
                    pondNumber: p.pondNumber,
                    dimensionAcres: p.dimensionAcres ? String(p.dimensionAcres) : (prev[id]?.dimensionAcres || "1.0"),
                    photo: null,
                    photoPreview: p.photo ? resolveMediaUrl(p.photo) : (prev[id]?.photoPreview || null),
                    village: p.address?.village || prev[id]?.village || "",
                    taluk: p.address?.taluk || prev[id]?.taluk || "",
                    district: p.address?.district || prev[id]?.district || "",
                    state: p.address?.state || prev[id]?.state || "",
                    pinCode: p.address?.pinCode || prev[id]?.pinCode || "",
                  };
                });
                return updated;
              });

              // Cache in local storage
              const currentFarm = JSON.parse(localStorage.getItem("aqua-farm") || "{}");
              localStorage.setItem("aqua-farm", JSON.stringify({ ...currentFarm, ponds: livePonds }));
            }
          })
          .catch((err) => console.warn("Ponds fetch error:", err));

        // 3. Hydrate insurance policies from DB
        axios
          .get(`/api/insurances?farmerId=${sess.farmerId}`)
          .then((insRes) => {
            if (insRes.data?.success && Array.isArray(insRes.data?.data)) {
              setPolicies(insRes.data.data);
            }
          })
          .catch((err) => console.warn("Policies fetch error:", err))
          .finally(() => setLoadingPolicies(false));
      }
    } catch (e) {
      console.error("Insured ponds hydration error:", e);
      setLoadingPolicies(false);
    }
  }, [navigate]);

  const { syncStatus } = useAutoSave(pondDetails);

  // Helper to match a pond with a policy
  const isPondCoveredByPolicy = (pond: any, pol: any) => {
    if (!pond || !pol) return false;
    const pId = pond._id ? String(pond._id) : pond.pondId ? String(pond.pondId) : "";
    const pNum = pond.pondNumber ? Number(pond.pondNumber) : null;

    // 1. Direct pol.pondId match
    const polPondId = pol.pondId?._id ? String(pol.pondId._id) : pol.pondId ? String(pol.pondId) : "";
    const polPondNum = pol.pondId?.pondNumber ? Number(pol.pondId.pondNumber) : null;

    if (polPondId && (polPondId === pId || (pond._id && polPondId === String(pond._id)))) {
      return true;
    }
    if (pNum !== null && polPondNum !== null && pNum === polPondNum) {
      return true;
    }

    // 2. pol.insuredPondIds array match
    if (Array.isArray(pol.insuredPondIds)) {
      for (const item of pol.insuredPondIds) {
        const itemId =
          typeof item === "object" && item !== null
            ? String(item._id || item.id || "")
            : String(item || "");
        const itemNum =
          typeof item === "object" && item !== null && item.pondNumber
            ? Number(item.pondNumber)
            : null;

        if (itemId && (itemId === pId || (pond._id && itemId === String(pond._id)))) {
          return true;
        }
        if (pNum !== null && itemNum !== null && pNum === itemNum) {
          return true;
        }
      }
    }

    return false;
  };

  // Filter for only insured ponds when in read-only mode
  const insuredPonds = useMemo(() => {
    return allPondsList.filter((pond) => {
      // Priority 1: Check against real policies from database
      const hasPolicy = policies.some((pol) => isPondCoveredByPolicy(pond, pol));
      if (hasPolicy) return true;

      // Priority 2: Fallback to draft selection only if policies list is empty
      if (policies.length === 0) {
        try {
          const s = localStorage.getItem("draft_selected_pond_ids");
          if (s) {
            const selIds = JSON.parse(s);
            const pId = pond._id ? String(pond._id) : pond.pondId ? String(pond.pondId) : "";
            if (
              Array.isArray(selIds) &&
              (selIds.includes(pId) || (pond._id && selIds.includes(String(pond._id))))
            ) {
              return true;
            }
          }
        } catch {}
      }

      return false;
    });
  }, [allPondsList, policies]);

  const getPolicyForPond = (pond: any) => {
    return policies.find((pol) => isPondCoveredByPolicy(pond, pol));
  };

  const togglePondSelection = (id: string) => {
    setSelectedPonds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const updateDimension = (pondId: string, val: string) => {
    setPondDetails((prev) => ({
      ...prev,
      [pondId]: { ...prev[pondId], dimensionAcres: val },
    }));
  };

  const handlePhotoUpload = (pondId: string, file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPondDetails((prev) => ({
      ...prev,
      [pondId]: { ...prev[pondId], photo: file, photoPreview: url },
    }));
  };

  const handleCameraCapture = (file: File) => {
    if (!cameraOpenFor) return;
    handlePhotoUpload(cameraOpenFor, file);
    setCameraOpenFor(null);
  };

  const clearPhoto = (pondId: string) => {
    setPondDetails((prev) => ({
      ...prev,
      [pondId]: { ...prev[pondId], photo: null, photoPreview: null },
    }));
  };

  const onSubmit = async () => {
    if (selectedPonds.length === 0) {
      toast.error("Please select at least one pond to insure.");
      return;
    }

    setSubmitting(true);

    try {
      const session = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = session.farmerId;
      const targetFarmId = farmId || JSON.parse(localStorage.getItem("aqua-farm") || "{}").farmId;

      const pondsToProcess = Object.values(pondDetails).filter((p) =>
        selectedPonds.includes(p.pondId)
      );

      const pondsPayload: any[] = [];
      for (const detail of pondsToProcess) {
        let photoUrl: string | null = null;
        if (detail.photo instanceof File && farmerId) {
          const uploaded = await uploadToSeaweedFS(
            detail.photo,
            `farmers/${farmerId}/ponds/${detail.pondId}`
          );
          photoUrl = uploaded?.key || uploaded?.url || null;
        } else if (detail.photoPreview && !detail.photoPreview.startsWith("blob:")) {
          photoUrl = detail.photoPreview;
        }

        pondsPayload.push({
          pondId: detail.pondId.startsWith("pond-") ? undefined : detail.pondId,
          pondNumber: detail.pondNumber,
          dimensionAcres: parseFloat(detail.dimensionAcres) || 1.0,
          photo: photoUrl,
          address: {
            village: detail.village,
            taluk: detail.taluk,
            district: detail.district,
            state: detail.state,
            pinCode: detail.pinCode,
          },
        });
      }

      if (targetFarmId) {
        try {
          await axios.patch(`/api/farms/${targetFarmId}/ponds`, {
            farmerId,
            ponds: pondsPayload,
          });
        } catch (pe) {
          console.warn("Ponds batch patch warning:", pe);
        }
      }

      // Store selected pond IDs for Step 7 (Variable Insurance Registration)
      localStorage.setItem("draft_selected_pond_ids", JSON.stringify(selectedPonds));

      toast.success("Insured ponds selected!");
      if (isEditMode) {
        navigate("/settings", { replace: true });
      } else {
        navigate("/insurance-registration");
      }
    } catch (err: any) {
      console.error("Pond selection error:", err);
      toast.error(err.response?.data?.error || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // READ-ONLY VIEW (FOR DASHBOARD ACCESS)
  // ══════════════════════════════════════════════════════════════════════════════
  if (isReadOnly) {
    return (
      <div
        className="h-full min-h-[100dvh] flex flex-col overflow-hidden bg-stone-50 relative text-stone-800 font-sans"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

        {/* SCROLLABLE INNER BODY */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-12">
          {/* Top Brand Header */}
          <div
            className="px-5 pt-8 pb-7 rounded-b-[2.5rem] relative overflow-hidden shrink-0"
            style={{
              background: "linear-gradient(140deg, #1c4a3e 0%, #1c6b5a 45%, #2d9b7f 100%)",
              boxShadow: "0 8px 32px -6px rgba(28,74,62,0.28)",
            }}
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all touch-manipulation active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
                    {t("dashboard.insuredPonds", "Insured Ponds")}
                  </h1>
                  <p className="text-[11px] text-white/70 font-medium">
                    Record Keeping · {insuredPonds.length} Active {insuredPonds.length === 1 ? "Pond" : "Ponds"}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15">
                Aqua <span className="text-amber-300">AI</span>nsure
              </span>
            </div>
          </div>

          <div className="px-4 mt-5 space-y-4">
            {/* Top Info Banner */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-stone-800">Verified Insured Ponds</h2>
                  <p className="text-[11px] text-stone-400">
                    Read-only specifications and active policy details
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                  {insuredPonds.length} Insured
                </span>
                <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-1 rounded-full border border-stone-200">
                  Read-Only
                </span>
              </div>
            </div>

            {/* Skeleton Loading State */}
            {loadingPolicies ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs animate-pulse space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-stone-200" />
                        <div className="space-y-1">
                          <div className="w-24 h-4 bg-stone-200 rounded" />
                          <div className="w-32 h-3 bg-stone-100 rounded" />
                        </div>
                      </div>
                      <div className="w-16 h-6 bg-stone-200 rounded-lg" />
                    </div>
                    <div className="w-full aspect-video bg-stone-200 rounded-xl" />
                    <div className="grid grid-cols-2 gap-2 bg-stone-100/60 rounded-xl p-3 h-24" />
                  </div>
                ))}
              </div>
            ) : insuredPonds.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-stone-200/80 shadow-xs text-center space-y-3 mt-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-teal-600">
                  <Waves size={24} />
                </div>
                <h3 className="text-base font-bold text-stone-800">No Insured Ponds Found</h3>
                <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                  None of your registered ponds currently have an active insurance policy attached.
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => navigate("/insurance-registration")}
                    className="h-11 px-5 rounded-xl text-white font-bold text-xs"
                    style={{
                      background: "linear-gradient(110deg, #1c6b5a, #2d9b7f)",
                      boxShadow: "0 4px 16px -2px rgba(28,107,90,0.3)",
                    }}
                  >
                    Insure Ponds Now →
                  </Button>
                </div>
              </div>
            ) : (
              /* Insured Ponds Cards List */
              <div className="space-y-4">
                {insuredPonds.map((pond) => {
                  const pId = pond._id || pond.pondId || `pond-${pond.pondNumber}`;
                  const detail = pondDetails[pId];
                  const policy = getPolicyForPond(pond);
                  const photoUrl = detail?.photoPreview || (pond.photo ? resolveMediaUrl(pond.photo) : null);

                  const speciesName =
                    policy?.species === "tiger"
                      ? "P. Monodon (Black Tiger)"
                      : policy?.species === "vannamei"
                      ? "L. Vannamei (Whiteleg)"
                      : policy?.species || "L. Vannamei (Whiteleg)";

                  const policyTypeName =
                    policy?.insuranceType === "basic"
                      ? "Standard Basic (Calamity)"
                      : "Comprehensive (All Risks)";

                  return (
                    <div
                      key={pId}
                      className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3"
                    >
                      {/* Pond Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-teal-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                            {pond.pondNumber}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-stone-800">
                              {pond.name || `Pond ${pond.pondNumber}`}
                            </h3>
                            <p className="text-[11px] text-stone-400">
                              Survey: {pond.surveyNumber || "N/A"} · {pond.dimensionAcres || detail?.dimensionAcres || 1.0} Acres
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 flex items-center gap-1">
                          <ShieldCheck size={12} className="text-teal-600" />
                          Insured
                        </span>
                      </div>

                      {/* Pond Photo (Read-only banner with zoom preview) */}
                      {photoUrl ? (
                        <div
                          className="relative rounded-xl overflow-hidden border border-stone-200 aspect-video flex items-center justify-center bg-stone-900 cursor-pointer group"
                          onClick={() => setPreviewImg(photoUrl)}
                        >
                          <img
                            src={photoUrl}
                            alt={`Pond ${pond.pondNumber}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px] font-medium">
                            <span className="bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px]">
                              Water Spread Area: {pond.dimensionAcres || detail?.dimensionAcres || 1.0} Acres
                            </span>
                            <span className="bg-teal-700/80 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                              <Eye size={11} /> Tap to Zoom
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/70 p-4 text-center">
                          <Waves size={20} className="text-stone-300 mx-auto mb-1" />
                          <p className="text-[11px] text-stone-400 font-medium">No photo uploaded for this pond</p>
                        </div>
                      )}

                      {/* Read-Only Details Grid */}
                      <div className="grid grid-cols-2 gap-2.5 bg-stone-50/80 rounded-xl p-3 border border-stone-100 text-xs">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            Cultured Species
                          </p>
                          <p className="text-xs font-bold text-stone-800 mt-0.5">{speciesName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            Policy Type
                          </p>
                          <p className="text-xs font-bold text-teal-700 mt-0.5">{policyTypeName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            Stocking Density
                          </p>
                          <p className="text-xs font-bold text-stone-800 mt-0.5">
                            {policy?.stockingDensity || 40} PL / m²
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            Coverage Period
                          </p>
                          <p className="text-xs font-bold text-stone-800 mt-0.5">
                            {policy?.insurancePeriodDays || 120} Days
                          </p>
                        </div>
                        {policy?.stockingDate && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                              Stocking Date
                            </p>
                            <p className="text-xs font-bold text-stone-800 mt-0.5">
                              {format(new Date(policy.stockingDate), "dd MMM yyyy")}
                            </p>
                          </div>
                        )}
                        {policy?.plannedHarvestDate && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                              Planned Harvest
                            </p>
                            <p className="text-xs font-bold text-stone-800 mt-0.5">
                              {format(new Date(policy.plannedHarvestDate), "dd MMM yyyy")}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Location Chip */}
                      {(detail?.village || pond.address?.village || detail?.district || pond.address?.district) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 pt-0.5">
                          <MapPin size={13} className="text-stone-400 shrink-0" />
                          <span>
                            {[
                              detail?.village || pond.address?.village,
                              detail?.taluk || pond.address?.taluk,
                              detail?.district || pond.address?.district,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Photo Zoom Modal */}
        {previewImg && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
            onClick={() => setPreviewImg(null)}
          >
            <div className="relative max-w-xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl bg-black z-[101]">
              <button
                type="button"
                onClick={() => setPreviewImg(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black z-10"
              >
                <X size={18} />
              </button>
              <img
                src={previewImg}
                alt="Pond Zoom Preview"
                className="max-h-[80vh] w-auto object-contain mx-auto"
              />
            </div>
          </div>
        )}

        <BottomNav />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // EDITABLE ONBOARDING VIEW (STEP 6 OR ?mode=edit)
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="h-full flex flex-col overflow-hidden bg-stone-50 relative text-stone-800 font-sans"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <SyncIndicator status={syncStatus} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

      {cameraOpenFor && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setCameraOpenFor(null)}
          title="Capture Pond Photo"
          facingMode="environment"
        />
      )}

      {/* SCROLLABLE INNER BODY */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-8">
        {/* REUSABLE 7-STEP HEADER (Step 6: Select Insured Ponds) */}
        <RegistrationHeader
          currentStep={5}
          title="Select Insured Ponds"
        />

        <div className="px-4 mt-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center">
              <Waves size={16} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-700">Pond Dimensions & Photos</h2>
              <p className="text-[11px] text-stone-400">Specify water spread size and upload photos</p>
            </div>
          </div>

          {/* Pond Selector Badges */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-stone-500 ml-0.5 block">
              Select Ponds to Cover
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.values(pondDetails).map((p) => {
                const isSelected = selectedPonds.includes(p.pondId);
                return (
                  <button
                    key={p.pondId}
                    type="button"
                    onClick={() => togglePondSelection(p.pondId)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? "text-white border-transparent shadow-sm"
                        : "bg-white text-stone-500 border-stone-200 hover:border-teal-300"
                    }`}
                    style={
                      isSelected
                        ? {
                            background: "linear-gradient(110deg, #1c6b5a, #2d9b7f)",
                            boxShadow: "0 4px 12px -2px rgba(28,107,90,0.25)",
                          }
                        : {}
                    }
                  >
                    Pond {p.pondNumber} {isSelected ? "✓" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pond cards */}
          <div className="space-y-4 pt-2 border-t border-stone-100">
            {Object.values(pondDetails)
              .filter((p) => selectedPonds.includes(p.pondId))
              .map((pond) => (
                <div
                  key={pond.pondId}
                  className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                        {pond.pondNumber}
                      </span>
                      <span className="text-sm font-bold text-stone-800">
                        Pond {pond.pondNumber}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      Insured
                    </span>
                  </div>

                  {/* Dimension */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-500">
                      Water Spread Area (Acres) <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={pond.dimensionAcres}
                      onChange={(e) => updateDimension(pond.pondId, e.target.value)}
                      placeholder="e.g. 1.2"
                      className="h-11 rounded-xl text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25"
                    />
                  </div>

                  {/* Photo */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-500">
                      Pond Photo (Optional)
                    </label>
                    {pond.photoPreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-stone-200 aspect-video flex items-center justify-center bg-stone-100">
                        <img
                          src={pond.photoPreview}
                          alt=""
                          onError={() => clearPhoto(pond.pondId)}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => clearPhoto(pond.pondId)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCameraOpenFor(pond.pondId)}
                          className="flex items-center justify-center gap-1.5 h-11 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold transition"
                        >
                          <Camera size={15} className="text-teal-600" />
                          Take Photo
                        </button>
                        <label className="flex items-center justify-center gap-1.5 h-11 rounded-xl border border-dashed border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold cursor-pointer transition">
                          <Upload size={15} className="text-stone-500" />
                          Upload File
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(pond.pondId, e.target.files?.[0])}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/farm-setup")}
              className="flex-1 h-12 rounded-xl border-stone-200 text-stone-600 font-semibold"
            >
              ← Back to Ponds
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={onSubmit}
              className="flex-1 h-12 rounded-xl text-white font-bold"
              style={{
                background: "linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)",
                boxShadow: "0 6px 24px -4px rgba(28,107,90,0.28)",
              }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                "Next: Configure Insurance →"
              )}
            </Button>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
