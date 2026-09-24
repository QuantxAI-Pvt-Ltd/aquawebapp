import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldCheck, Loader2 } from "lucide-react";
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
import SyncIndicator from "@/components/SyncIndicator";
import RegistrationHeader from "@/components/RegistrationHeader";
import { useAutoSave } from "@/hooks/useAutoSave";
import { addDays, format } from "date-fns";
import axios from "@/lib/api";

const insuranceSchema = z.object({
  stockingDate: z.string().min(1, "insurance.errors.date"),
  stockingDensity: z.string().min(1, "insurance.errors.density"),
  insuranceType: z.string().min(1, "insurance.errors.type"),
  insurancePeriod: z.string().min(1, "insurance.errors.period"),
  species: z.string().min(1, "insurance.errors.species"),
});

type InsuranceForm = z.infer<typeof insuranceSchema>;

export default function InsuranceRegistration() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InsuranceForm>({
    resolver: zodResolver(insuranceSchema as any),
    defaultValues: (() => {
      const draftStr = typeof window !== "undefined" ? localStorage.getItem("draft_insurance_form") : null;
      if (draftStr) {
        try {
          return JSON.parse(draftStr);
        } catch (e) {}
      }
      return { insuranceType: "comprehensive", insurancePeriod: "120", species: "vannamei", stockingDensity: "40" };
    })(),
  });

  const formValues = watch();

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("draft_insurance_form", JSON.stringify(formValues));
    }
  }, [formValues]);

  // Load ponds from farm data in localStorage
  const farmData = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("aqua-farm") || "{}") : {};
  const allPonds: any[] = farmData.ponds || [];
  const totalPonds = allPonds.length;

  const [selectedPonds, setSelectedPonds] = useState<string[]>(() => {
    const draftStr = typeof window !== "undefined" ? localStorage.getItem("draft_insurance_ponds") : null;
    if (draftStr) {
      try {
        return JSON.parse(draftStr);
      } catch (e) {}
    }
    return allPonds.map((p: any, i: number) => p._id || p.pondId || `pond-${i + 1}`).filter(Boolean);
  });

  useEffect(() => {
    if (selectedPonds.length === 0 && allPonds.length > 0) {
      const allIds = allPonds.map((p: any, i: number) => p._id || p.pondId || `pond-${i + 1}`).filter(Boolean);
      if (allIds.length > 0) setSelectedPonds(allIds);
    }
  }, [allPonds.length]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("draft_insurance_ponds", JSON.stringify(selectedPonds));
    }
  }, [selectedPonds]);

  const { syncStatus } = useAutoSave([formValues, selectedPonds]);

  const togglePond = (pondId: string) => {
    setSelectedPonds((prev) =>
      prev.includes(pondId) ? prev.filter((id) => id !== pondId) : [...prev, pondId]
    );
  };

  const onSubmit = async (data: InsuranceForm) => {
    try {
      const session = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = session.farmerId;
      if (!farmerId) {
        toast.error("Session expired. Please login again.");
        return;
      }

      const farmDataStr = localStorage.getItem("aqua-farm");
      if (!farmDataStr) {
        toast.error("Farm details not found. Please complete Farm Registration first.");
        navigate("/farm-registration");
        return;
      }

      const parsedFarm = JSON.parse(farmDataStr);
      const farmId = parsedFarm.farmId;
      const ponds = parsedFarm.ponds || [];

      if (!farmId) {
        toast.error("Invalid Farm ID. Please go back to Farm Registration.");
        return;
      }

      if (selectedPonds.length === 0) {
        toast.error("Please select at least one pond to insure.");
        return;
      }

      toast.loading(t("common.saving"), { id: "insurance-save" });

      const stockingDate = new Date(data.stockingDate);
      const periodDays = parseInt(data.insurancePeriod, 10) || 120;
      const plannedHarvestDate = format(addDays(stockingDate, periodDays), "yyyy-MM-dd");
      const maxHarvestDate = format(addDays(stockingDate, periodDays + 15), "yyyy-MM-dd");

      const firstPondId = selectedPonds[0] || ponds[0]?._id || ponds[0]?.pondId || "pond-1";

      const payload = {
        ...data,
        stockingDensity: Number(data.stockingDensity),
        insurancePeriodDays: periodDays,
        pondId: firstPondId,
        farmerId,
        farmId,
        plannedHarvestDate,
        maxHarvestDate,
        insuredPondIds: selectedPonds,
      };

      const res = await axios.post("/api/insurances", payload);

      if (res.data?.success) {
        parsedFarm.insuredPondIds = selectedPonds;
        localStorage.setItem("aqua-farm", JSON.stringify(parsedFarm));

        toast.dismiss("insurance-save");
        toast.success(t("insurance.saved") || "Insurance policy saved!");

        navigate("/insured-ponds");
      }
    } catch (error: any) {
      toast.dismiss("insurance-save");
      console.error("Insurance submission error:", error);
      toast.error(error.response?.data?.error || t("common.error"));
    }
  };

  const inputClasses =
    "h-12 rounded-xl text-base sm:text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25 focus-visible:border-teal-500 placeholder:text-stone-400";

  return (
    <div
      className="h-full flex flex-col overflow-hidden bg-stone-50 relative text-stone-800 font-sans"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <SyncIndicator status={syncStatus} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

      {/* SCROLLABLE INNER BODY */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-8">
        {/* REUSABLE HEADER WITH STEP 3 ACTIVE */}
        <RegistrationHeader
          currentStep={2}
          title={t("insurance.title") || "Insurance Setup"}
          syncStatus={syncStatus}
        />

        <div className="px-4 mt-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center">
              <ShieldCheck size={16} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-700">Policy & Coverage Terms</h2>
              <p className="text-[11px] text-stone-400">Configure stocking schedule and covered ponds</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Stocking Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                {t("insurance.stockingDate")} <span className="text-rose-500">*</span>
              </label>
              <Input type="date" {...register("stockingDate")} className={inputClasses} />
              {errors.stockingDate && (
                <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.stockingDate.message as string)}</p>
              )}
            </div>

            {/* Stocking Density */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                {t("insurance.density")} (PL / m²) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                {...register("stockingDensity")}
                placeholder="e.g. 40"
                className={inputClasses}
              />
              {errors.stockingDensity && (
                <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.stockingDensity.message as string)}</p>
              )}
            </div>

            {/* Insurance Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                {t("insurance.type")}
              </label>
              <Select
                onValueChange={(v) => setValue("insuranceType", v, { shouldValidate: true })}
                value={watch("insuranceType")}
              >
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder={t("insurance.type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">Comprehensive Risk Cover</SelectItem>
                  <SelectItem value="basic">Basic Mortality Cover</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Insurance Period */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                {t("insurance.period")} (Days)
              </label>
              <Select
                onValueChange={(v) => setValue("insurancePeriod", v, { shouldValidate: true })}
                value={watch("insurancePeriod")}
              >
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder={t("insurance.period")} />
                </SelectTrigger>
                <SelectContent>
                  {[30, 60, 90, 120, 150, 180, 200].map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} Days ({Math.round(d / 30)} Months)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ponds Under Insurance */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="text-xs font-semibold text-stone-500 ml-0.5 block">
                Ponds Under Insurance Coverage <span className="text-rose-500">*</span>
              </label>
              {allPonds.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  No ponds found in local cache. All registered ponds will be covered automatically.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allPonds.map((p: any, i: number) => {
                    const id = p._id || p.pondId || `pond-${i + 1}`;
                    const isSelected = selectedPonds.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => togglePond(id)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
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
                        Pond {p.pondNumber || i + 1} {isSelected ? "✓" : ""}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-teal-700 pl-0.5">
                {selectedPonds.length} pond{selectedPonds.length > 1 ? "s" : ""} selected for insurance.
              </p>
            </div>

            {/* Species */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                {t("insurance.species")}
              </label>
              <Select
                onValueChange={(v) => setValue("species", v, { shouldValidate: true })}
                value={watch("species")}
              >
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder={t("insurance.species")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vannamei">L. Vannamei (Whiteleg Shrimp)</SelectItem>
                  <SelectItem value="tiger">P. Monodon (Black Tiger Shrimp)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/farm-registration")}
                className="flex-1 h-12 rounded-xl border-stone-200 text-stone-600 font-semibold"
              >
                ← Back to Farm
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-xl text-white font-bold"
                style={{
                  background: "linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)",
                  boxShadow: "0 6px 24px -4px rgba(28,107,90,0.28)",
                }}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  "Next: Pond Details →"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}