import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
} from "lucide-react";
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

  // All ponds available on the farm
  const [allPonds, setAllPonds] = useState<any[]>([]);
  // IDs of ponds selected to be insured
  const [selectedPondIds, setSelectedPondIds] = useState<string[]>([]);
  // Configuration per pond (cached for all ponds so toggling doesn't lose state)
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
            let livePonds: any[] = [];
            if (pRes.data?.success && Array.isArray(pRes.data?.data) && pRes.data.data.length > 0) {
              livePonds = pRes.data.data;
            } else {
              // Fallback to local storage aqua-farm if API returns empty
              try {
                const fd = JSON.parse(localStorage.getItem("aqua-farm") || "{}");
                if (Array.isArray(fd.ponds) && fd.ponds.length > 0) {
                  livePonds = fd.ponds;
                }
              } catch {}
            }

            if (livePonds.length === 0) {
              // Minimal fallback
              livePonds = [{ pondId: "pond-1", pondNumber: 1, name: "Pond 1", dimensionAcres: 1.0 }];
            }

            setAllPonds(livePonds);

            // Read selected pond IDs from Step 6 draft
            let storedSelectedIds: string[] = [];
            try {
              const s = localStorage.getItem("draft_selected_pond_ids");
              if (s) storedSelectedIds = JSON.parse(s);
            } catch {}

            const allPondIds = livePonds.map(
              (p: any) => p._id || p.pondId || `pond-${p.pondNumber}`
            );

            // If draft selections exist, match them with existing ponds; otherwise select all by default
            const initialSelected =
              storedSelectedIds.length > 0
                ? allPondIds.filter((id: string) =>
                    storedSelectedIds.includes(id) ||
                    storedSelectedIds.some((sId) => id.includes(sId) || sId.includes(id))
                  )
                : allPondIds;

            const finalSelected = initialSelected.length > 0 ? initialSelected : allPondIds;
            setSelectedPondIds(finalSelected);

            const todayStr = format(new Date(), "yyyy-MM-dd");

            // Also check if any existing policies exist in DB
            axios
              .get(`/api/insurances?farmerId=${sess.farmerId}`)
              .then((insRes) => {
                const existingPolicies =
                  insRes.data?.success && Array.isArray(insRes.data?.data)
                    ? insRes.data.data
                    : [];

                const configs: PondPolicyConfig[] = livePonds.map((p: any) => {
                  const pId = p._id || p.pondId || `pond-${p.pondNumber}`;
                  const existing = existingPolicies.find(
                    (ep: any) => ep.pondId === pId || ep.pondId?._id === pId
                  ) || existingPolicies[0];

                  let sDate = todayStr;
                  if (existing?.stockingDate) {
                    sDate = existing.stockingDate.split("T")[0];
                  }

                  return {
                    pondId: pId,
                    pondNumber: p.pondNumber || 1,
                    name: p.name || `Pond ${p.pondNumber || 1}`,
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
                if (finalSelected.length > 0) {
                  setActiveTabPondId(finalSelected[0]);
                }
              })
              .catch(() => {
                const configs: PondPolicyConfig[] = livePonds.map((p: any) => {
                  const pId = p._id || p.pondId || `pond-${p.pondNumber}`;
                  return {
                    pondId: pId,
                    pondNumber: p.pondNumber || 1,
                    name: p.name || `Pond ${p.pondNumber || 1}`,
                    surveyNumber: p.surveyNumber || "",
                    dimensionAcres: p.dimensionAcres || 1.0,
                    species: "vannamei",
                    stockingDensity: 40,
                    stockingDate: todayStr,
                    insuranceType: "comprehensive",
                    insurancePeriodDays: 120,
                  };
                });
                setPondPolicies(configs);
                if (finalSelected.length > 0) {
                  setActiveTabPondId(finalSelected[0]);
                }
              });
          })
          .catch((err) => console.warn("Insurance ponds fetch warning:", err));
      }
    } catch (e) {
      console.error("Insurance hydration error:", e);
    }
  }, [navigate]);

  const togglePondSelection = (id: string) => {
    setSelectedPondIds((prev) => {
      let next: string[];
      if (prev.includes(id)) {
        next = prev.filter((pId) => pId !== id);
      } else {
        next = [...prev, id];
      }

      try {
        localStorage.setItem("draft_selected_pond_ids", JSON.stringify(next));
      } catch {}

      // If the currently active tab was deselected, switch to the first remaining selected pond
      if (activeTabPondId === id) {
        const remaining = next.find((pId) => pId !== id);
        if (remaining) {
          setActiveTabPondId(remaining);
        }
      } else if (!next.includes(activeTabPondId) && next.length > 0) {
        setActiveTabPondId(next[0]);
      }

      return next;
    });
  };

  const isAllSelected = allPonds.length > 0 && selectedPondIds.length === allPonds.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedPondIds([]);
      try {
        localStorage.setItem("draft_selected_pond_ids", JSON.stringify([]));
      } catch {}
    } else {
      const allIds = allPonds.map((p) => p._id || p.pondId || `pond-${p.pondNumber}`);
      setSelectedPondIds(allIds);
      if (!allIds.includes(activeTabPondId) && allIds.length > 0) {
        setActiveTabPondId(allIds[0]);
      }
      try {
        localStorage.setItem("draft_selected_pond_ids", JSON.stringify(allIds));
      } catch {}
    }
  };

  const handlePolicyChange = (pondId: string, field: keyof PondPolicyConfig, value: any) => {
    setPondPolicies((prev) =>
      prev.map((p) => (p.pondId === pondId ? { ...p, [field]: value } : p))
    );
  };

  const handleCopyConfigToAll = (sourcePondId: string) => {
    const sourceConfig = pondPolicies.find((p) => p.pondId === sourcePondId);
    if (!sourceConfig) return;

    setPondPolicies((prev) =>
      prev.map((p) => {
        if (selectedPondIds.includes(p.pondId) && p.pondId !== sourcePondId) {
          return {
            ...p,
            species: sourceConfig.species,
            stockingDate: sourceConfig.stockingDate,
            stockingDensity: sourceConfig.stockingDensity,
            insuranceType: sourceConfig.insuranceType,
            insurancePeriodDays: sourceConfig.insurancePeriodDays,
          };
        }
        return p;
      })
    );
    toast.success(`Copied ${sourceConfig.name} configuration to all selected ponds!`);
  };

  // Only the selected ponds are shown in tabs and configured
  const selectedPondsConfigs = pondPolicies.filter((p) => selectedPondIds.includes(p.pondId));
  const currentPond =
    selectedPondsConfigs.find((p) => p.pondId === activeTabPondId) || selectedPondsConfigs[0];

  const onSubmit = async () => {
    if (selectedPondIds.length === 0 || selectedPondsConfigs.length === 0) {
      toast.error("Please select at least one pond to insure.");
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
        pondPolicies: selectedPondsConfigs.map((p) => {
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
          {/* Section Title Header */}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center">
              <ShieldCheck size={16} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-700">Per-Pond Insurance Policy</h2>
              <p className="text-[11px] text-stone-400">
                Select which ponds to insure, then customize their policy parameters
              </p>
            </div>
          </div>

          {/* ─── 1. POND SELECTION BOX ─── */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                  <CheckCircle2 size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-800">Select Ponds to Insure</h3>
                  <p className="text-[10px] text-stone-400">
                    Check the ponds you want covered under this policy
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                  {selectedPondIds.length} of {allPonds.length} Selected
                </span>
                {allPonds.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 underline underline-offset-2"
                  >
                    {isAllSelected ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>
            </div>

            {/* Ponds Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              {allPonds.map((p) => {
                const pId = p._id || p.pondId || `pond-${p.pondNumber}`;
                const isSelected = selectedPondIds.includes(pId);
                return (
                  <div
                    key={pId}
                    onClick={() => togglePondSelection(pId)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${
                      isSelected
                        ? "bg-teal-50/70 border-teal-600 ring-1 ring-teal-600/30 shadow-xs"
                        : "bg-white border-stone-200 hover:border-stone-300 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-teal-600 text-white"
                            : "border border-stone-300 bg-stone-50"
                        }`}
                      >
                        {isSelected && <CheckCircle2 size={13} className="text-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-800">
                            {p.name || `Pond ${p.pondNumber}`}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${
                              isSelected
                                ? "bg-teal-100 text-teal-800"
                                : "bg-stone-100 text-stone-500"
                            }`}
                          >
                            {isSelected ? "Insured" : "Excluded"}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400">
                          {p.surveyNumber ? `Survey: ${p.surveyNumber}` : "No Survey"} ·{" "}
                          {p.dimensionAcres || 1.0} Acres
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── 2. PER-POND CONFIGURATION SECTION ─── */}
          {selectedPondIds.length === 0 ? (
            <div className="bg-amber-50/70 rounded-2xl p-6 border border-amber-200 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
              <h3 className="text-sm font-bold text-amber-900">No Ponds Selected</h3>
              <p className="text-xs text-amber-700 max-w-sm mx-auto">
                Please select at least one pond in the box above to configure its insurance policy and complete registration.
              </p>
            </div>
          ) : (
            <>
              {/* Pond Tabs for Variable Insurance (only selected ponds) */}
              {selectedPondsConfigs.length > 1 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-xs font-bold text-stone-600">
                      Configure Pond:
                    </span>
                    <span className="text-[11px] text-stone-400">
                      Tap a pond tab to customize
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {selectedPondsConfigs.map((p) => {
                      const isActive = p.pondId === currentPond?.pondId;
                      return (
                        <button
                          key={p.pondId}
                          type="button"
                          onClick={() => setActiveTabPondId(p.pondId)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center gap-1.5 ${
                            isActive
                              ? "bg-teal-700 text-white border-teal-700 shadow-xs"
                              : "bg-white text-stone-600 border-stone-200 hover:border-teal-300"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-stone-100 text-stone-600"
                            }`}
                          >
                            {p.pondNumber}
                          </span>
                          <span>
                            {p.name || `Pond ${p.pondNumber}`} {p.surveyNumber ? `(${p.surveyNumber})` : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
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
                    <div className="flex items-center gap-2">
                      {selectedPondsConfigs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleCopyConfigToAll(currentPond.pondId)}
                          className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 bg-teal-50 hover:bg-teal-100/70 border border-teal-200 px-2 py-1 rounded-lg transition-colors"
                          title="Apply this configuration to all other selected ponds"
                        >
                          <Copy size={12} />
                          <span>Apply to all</span>
                        </button>
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                        Active
                      </span>
                    </div>
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
                      {t("insurance.stockingDate", "Date of Stocking")}{" "}
                      <span className="text-rose-500">*</span>
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
                      {t("insurance.stockingDensity", "Stocking Density")} (PL / m²){" "}
                      <span className="text-rose-500">*</span>
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
            </>
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
              disabled={Boolean(isSubmitting || selectedPondIds.length === 0)}
              onClick={onSubmit}
              className="flex-1 h-12 rounded-xl text-white font-bold disabled:opacity-50"
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