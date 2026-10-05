import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Loader2, Waves, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import RegistrationHeader from "@/components/RegistrationHeader";
import { addDays, format } from "date-fns";
import axios from "@/lib/api";

interface PondPolicyConfig {
  pondId: string;
  pondNumber: number;
  name: string;
  surveyNumber: string;
  dimensionAcres: number;
  species: string;
  stockingDensity: number;
  stockingDate: string;
  insuranceType: string;
  insurancePeriodDays: number;
}

export default function InsuranceRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("mode") === "edit";
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pondPolicies, setPondPolicies] = useState<PondPolicyConfig[]>([]);
  const [activeTabPondId, setActiveTabPondId] = useState<string>("");
  const [farmId, setFarmId] = useState<string>("");

  // DB as Single Source of Truth: Fetch existing farm, ponds, and policies on mount
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
        // 1. Fetch Farm
        axios
          .get(`/api/farms/${sess.farmerId}`)
          .then((fRes) => {
            if (fRes.data?.success && Array.isArray(fRes.data?.data) && fRes.data.data.length > 0) {
              setFarmId(fRes.data.data[0]._id);
            }
          })
          .catch(() => {});

        // 2. Fetch Ponds & Selected Ponds
        axios
          .get(`/api/farms/ponds?farmerId=${sess.farmerId}`)
          .then((pRes) => {
            if (pRes.data?.success && Array.isArray(pRes.data?.data) && pRes.data.data.length > 0) {
              const livePonds = pRes.data.data;

              // Read selected pond IDs from Step 6 draft
              let selectedIds: string[] = [];
              try {
                const s = localStorage.getItem("draft_selected_pond_ids");
                if (s) selectedIds = JSON.parse(s);
              } catch {}

              const pondsToCover = selectedIds.length > 0
                ? livePonds.filter((p: any) => selectedIds.includes(p._id) || selectedIds.includes(`pond-${p.pondNumber}`))
                : livePonds;

              const todayStr = format(new Date(), "yyyy-MM-dd");

              // Also check if any existing policies exist in DB
              axios
                .get(`/api/insurances?farmerId=${sess.farmerId}`)
                .then((insRes) => {
                  const existingPolicies = (insRes.data?.success && Array.isArray(insRes.data?.data))
                    ? insRes.data.data
                    : [];

                  const configs: PondPolicyConfig[] = pondsToCover.map((p: any) => {
                    const existing = existingPolicies.find((ep: any) =>
                      ep.pondId === p._id || ep.pondId?._id === p._id
                    ) || existingPolicies[0];

                    let sDate = todayStr;
                    if (existing?.stockingDate) {
                      sDate = existing.stockingDate.split("T")[0];
                    }

                    return {
                      pondId: p._id,
                      pondNumber: p.pondNumber,
                      name: p.name || `Pond ${p.pondNumber}`,
                      surveyNumber: p.surveyNumber || "",
                      dimensionAcres: p.dimensionAcres || 1.0,
                      species: existing?.species || "vannamei",
                      stockingDensity: existing?.stockingDensity || 40,
                      stockingDate: sDate,
                      insuranceType: existing?.insuranceType || "comprehensive",
                      insurancePeriodDays: existing?.insurancePeriodDays || 120,
                    };
                  });

                  setPondPolicies(configs);
                  if (configs.length > 0) {
                    setActiveTabPondId(configs[0].pondId);
                  }
                })
                .catch(() => {
                  const configs: PondPolicyConfig[] = pondsToCover.map((p: any) => ({
                    pondId: p._id,
                    pondNumber: p.pondNumber,
                    name: p.name || `Pond ${p.pondNumber}`,
                    surveyNumber: p.surveyNumber || "",
                    dimensionAcres: p.dimensionAcres || 1.0,
                    species: "vannamei",
                    stockingDensity: 40,
                    stockingDate: todayStr,
                    insuranceType: "comprehensive",
                    insurancePeriodDays: 120,
                  }));
                  setPondPolicies(configs);
                  if (configs.length > 0) {
                    setActiveTabPondId(configs[0].pondId);
                  }
                });
            }
          })
          .catch((err) => console.warn("Insurance ponds fetch warning:", err));
      }
    } catch (e) {
      console.error("Insurance hydration error:", e);
    }
  }, []);

  const handlePolicyChange = (pondId: string, field: keyof PondPolicyConfig, value: any) => {
    setPondPolicies((prev) =>
      prev.map((p) => (p.pondId === pondId ? { ...p, [field]: value } : p))
    );
  };

  const currentPond = pondPolicies.find((p) => p.pondId === activeTabPondId) || pondPolicies[0];

  const onSubmit = async () => {
    if (pondPolicies.length === 0) {
      toast.error("No insured ponds found. Please select ponds in Step 6.");
      navigate("/insured-ponds");
      return;
    }

    setIsSubmitting(true);

    try {
      const session = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = session.farmerId;
      if (!farmerId) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      const farmDataStr = localStorage.getItem("aqua-farm");
      const resolvedFarmId = farmId || (farmDataStr ? JSON.parse(farmDataStr).farmId : null);

      if (!resolvedFarmId) {
        toast.error("Farm ID not found. Please complete Farm Setup.");
        navigate("/farm-setup");
        return;
      }

      const payload = {
        farmerId,
        farmId: resolvedFarmId,
        pondPolicies: pondPolicies.map((p) => {
          const sDate = new Date(p.stockingDate);
          const plannedHarvestDate = format(addDays(sDate, p.insurancePeriodDays), "yyyy-MM-dd");
          const maxHarvestDate = format(addDays(sDate, p.insurancePeriodDays + 15), "yyyy-MM-dd");

          return {
            pondId: p.pondId,
            species: p.species,
            stockingDensity: Number(p.stockingDensity),
            stockingDate: p.stockingDate,
            insuranceType: p.insuranceType,
            insurancePeriodDays: Number(p.insurancePeriodDays),
            plannedHarvestDate,
            maxHarvestDate,
          };
        }),
      };

      const res = await axios.post("/api/insurances", payload);

      if (res.data?.success) {
        // Clean onboarding drafts
        localStorage.setItem("aqua-reg-complete", "1");
        localStorage.removeItem("draft_farmer");
        localStorage.removeItem("draft_farmer_address");
        localStorage.removeItem("draft_farmer_aadharNumber");
        localStorage.removeItem("draft_farm_location");
        localStorage.removeItem("draft_farm_form");
        localStorage.removeItem("draft_farm_infra");
        localStorage.removeItem("draft_insurance_form");
        localStorage.removeItem("draft_insured_ponds");
        localStorage.removeItem("draft_selected_pond_ids");

        toast.success(isEditMode ? "Insurance policies updated!" : "🎉 Onboarding completed successfully!");
        setTimeout(() => {
          if (isEditMode) {
            navigate("/settings", { replace: true });
          } else {
            navigate("/dashboard", { replace: true });
          }
        }, 300);
      }
    } catch (error: any) {
      console.error("Insurance submission error:", error);
      toast.error(error.response?.data?.error || t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses =
    "h-12 rounded-xl text-base sm:text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25 focus-visible:border-teal-500 placeholder:text-stone-400";

  return (
    <div
      className="h-full flex flex-col overflow-hidden bg-stone-50 relative text-stone-800 font-sans"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

      {/* SCROLLABLE INNER BODY */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-8">
        {/* REUSABLE 7-STEP HEADER (Step 7: Pond Insurance) */}
        <RegistrationHeader
          currentStep={6}
          title="Pond Insurance"
        />

        <div className="px-4 mt-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center">
              <ShieldCheck size={16} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-700">Per-Pond Insurance Policy</h2>
              <p className="text-[11px] text-stone-400">
                Customize species, stocking density, & period for each pond
              </p>
            </div>
          </div>

          {/* Pond Tabs for Variable Insurance */}
          {pondPolicies.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {pondPolicies.map((p) => {
                const isActive = p.pondId === currentPond?.pondId;
                return (
                  <button
                    key={p.pondId}
                    type="button"
                    onClick={() => setActiveTabPondId(p.pondId)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                      isActive
                        ? "bg-teal-700 text-white border-teal-700 shadow-xs"
                        : "bg-white text-stone-600 border-stone-200 hover:border-teal-300"
                    }`}
                  >
                    Pond {p.pondNumber} {p.surveyNumber ? `(${p.surveyNumber})` : ""}
                  </button>
                );
              })}
            </div>
          )}

          {currentPond && (
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white font-extrabold text-xs flex items-center justify-center">
                    {currentPond.pondNumber}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-800">
                      {currentPond.name} Configuration
                    </h3>
                    <p className="text-[11px] text-stone-400">
                      Survey: {currentPond.surveyNumber || "N/A"} · {currentPond.dimensionAcres} Acres
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                  Active
                </span>
              </div>

              {/* Species Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 ml-0.5">
                  Cultured Species <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  {[
                    { id: "vannamei", label: "L. Vannamei (Whiteleg)" },
                    { id: "tiger", label: "P. Monodon (Black Tiger)" },
                  ].map((sp) => {
                    const isSpActive = currentPond.species === sp.id;
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        className={`flex-1 h-11 rounded-xl text-xs font-bold transition-all border ${
                          isSpActive
                            ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                            : "bg-white text-stone-600 border-stone-200 hover:border-teal-200"
                        }`}
                        onClick={() => handlePolicyChange(currentPond.pondId, "species", sp.id)}
                      >
                        {sp.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stocking Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 ml-0.5">
                  {t("insurance.stockingDate") || "Stocking Date"} <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={currentPond.stockingDate}
                  onChange={(e) => handlePolicyChange(currentPond.pondId, "stockingDate", e.target.value)}
                  className={inputClasses}
                />
              </div>

              {/* Stocking Density */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 ml-0.5">
                  {t("insurance.density") || "Stocking Density"} (PL / m²) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  min="5"
                  max="120"
                  value={currentPond.stockingDensity}
                  onChange={(e) => handlePolicyChange(currentPond.pondId, "stockingDensity", Number(e.target.value))}
                  placeholder="e.g. 40"
                  className={inputClasses}
                />
              </div>

              {/* Insurance Policy Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 ml-0.5">
                  Policy Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "comprehensive", title: "Comprehensive", desc: "All risks + disease" },
                    { id: "basic", title: "Standard Basic", desc: "Calamity & mortality" },
                  ].map((pol) => {
                    const isPolActive = currentPond.insuranceType === pol.id;
                    return (
                      <button
                        key={pol.id}
                        type="button"
                        className={`p-3 rounded-xl text-left border transition-all ${
                          isPolActive
                            ? "bg-teal-50 border-teal-600 ring-1 ring-teal-600"
                            : "bg-white border-stone-200 hover:border-teal-200"
                        }`}
                        onClick={() => handlePolicyChange(currentPond.pondId, "insuranceType", pol.id)}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-stone-800">{pol.title}</span>
                          {isPolActive && <CheckCircle2 size={13} className="text-teal-600" />}
                        </div>
                        <p className="text-[10px] text-stone-500">{pol.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Insurance Period (Days) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 ml-0.5">
                  Coverage Duration (Crop Period) <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={String(currentPond.insurancePeriodDays)}
                  onValueChange={(val) => handlePolicyChange(currentPond.pondId, "insurancePeriodDays", parseInt(val, 10))}
                >
                  <SelectTrigger className={inputClasses}>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="90">90 Days (Short Cycle)</SelectItem>
                    <SelectItem value="120">120 Days (Standard Cycle)</SelectItem>
                    <SelectItem value="150">150 Days (Extended Harvest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/insured-ponds")}
              className="flex-1 h-12 rounded-xl border-stone-200 text-stone-600 font-semibold"
            >
              ← Back to Ponds
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={onSubmit}
              className="flex-1 h-12 rounded-xl text-white font-bold"
              style={{
                background: "linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)",
                boxShadow: "0 6px 24px -4px rgba(28,107,90,0.28)",
              }}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                "Complete Registration ✓"
              )}
            </Button>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}