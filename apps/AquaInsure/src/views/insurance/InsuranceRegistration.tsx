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
    defaultValues: {
      insuranceType: "comprehensive",
      insurancePeriod: "120",
      species: "vannamei",
      stockingDensity: "40",
      stockingDate: "",
    },
  });

  const formValues = watch();
  const { syncStatus } = useAutoSave(formValues);

  const onSubmit = async (data: InsuranceForm) => {
    try {
      const session = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = session.farmerId;
      if (!farmerId) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      const farmDataStr = localStorage.getItem("aqua-farm");
      if (!farmDataStr) {
        toast.error("Farm details not found. Please complete Farm Setup first.");
        navigate("/farm-setup");
        return;
      }

      const parsedFarm = JSON.parse(farmDataStr);
      const farmId = parsedFarm.farmId;
      const ponds = parsedFarm.ponds || [];

      if (!farmId) {
        toast.error("Invalid Farm ID. Please return to Farm Setup.");
        return;
      }

      toast.loading(t("common.saving"), { id: "insurance-save" });

      const stockingDate = new Date(data.stockingDate);
      const periodDays = parseInt(data.insurancePeriod, 10) || 120;
      const plannedHarvestDate = format(addDays(stockingDate, periodDays), "yyyy-MM-dd");
      const maxHarvestDate = format(addDays(stockingDate, periodDays + 15), "yyyy-MM-dd");

      const allPondIds = ponds.map((p: any, i: number) => p._id || p.pondId || `pond-${i + 1}`);
      const firstPondId = allPondIds[0] || "pond-1";

      const payload = {
        ...data,
        stockingDensity: Number(data.stockingDensity),
        insurancePeriodDays: periodDays,
        pondId: firstPondId,
        farmerId,
        farmId,
        plannedHarvestDate,
        maxHarvestDate,
        insuredPondIds: allPondIds,
      };

      const res = await axios.post("/api/insurances", payload);

      if (res.data?.success) {
        parsedFarm.insuredPondIds = allPondIds;
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
        {/* REUSABLE 7-STEP HEADER (Step 6 Active) */}
        <RegistrationHeader
          currentStep={5}
          title="Insurance Policy"
          syncStatus={syncStatus}
        />

        <div className="px-4 mt-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center">
              <ShieldCheck size={16} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-700">Coverage & Stocking Schedule</h2>
              <p className="text-[11px] text-stone-400">Configure insurance policy terms and crop cycle</p>
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
                onClick={() => navigate("/farm-setup")}
                className="flex-1 h-12 rounded-xl border-stone-200 text-stone-600 font-semibold"
              >
                ← Back to Farm Setup
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
                  "Next: Insured Ponds →"
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