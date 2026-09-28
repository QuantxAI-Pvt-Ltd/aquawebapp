import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BottomNav from "@/components/BottomNav";
import RegistrationHeader from "@/components/RegistrationHeader";
import axios from "@/lib/api";

interface PondConfig {
  pondNumber: number;
  name: string;
  surveyNumber: string;
  pattaNumber: string;
  dimensionAcres: string;
}

const setupSchema = z.object({
  ownership: z.string().min(1, "farm.errors.ownership"),
  patta: z.string().min(1, "farm.errors.patta"),
  totalPonds: z.string().min(1, "farm.errors.ponds"),
});

type SetupForm = z.infer<typeof setupSchema>;

export default function FarmSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("mode") === "edit";

  const [pondsList, setPondsList] = useState<PondConfig[]>([
    { pondNumber: 1, name: "Pond 1", surveyNumber: "", pattaNumber: "", dimensionAcres: "1.0" },
  ]);

  const [infra, setInfra] = useState({
    filtration: "",
    reservoir: "",
    farmFencing: "",
    birdFencing: "",
    dips: "",
    power: "",
    aerators: "",
    nursery: "",
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SetupForm>({
    resolver: zodResolver(setupSchema as any),
    defaultValues: {
      ownership: "owned",
      patta: "",
      totalPonds: "1",
    },
  });

  const watchedTotalPonds = watch("totalPonds");
  const watchedPatta = watch("patta");

  // Synchronize ponds list whenever totalPonds count changes
  useEffect(() => {
    const count = parseInt(watchedTotalPonds || "1", 10) || 1;
    setPondsList((prev) => {
      const updated: PondConfig[] = [];
      for (let i = 1; i <= count; i++) {
        const existing = prev.find((p) => p.pondNumber === i);
        if (existing) {
          updated.push(existing);
        } else {
          updated.push({
            pondNumber: i,
            name: `Pond ${i}`,
            surveyNumber: watchedPatta ? `${watchedPatta}/${i}` : "",
            pattaNumber: watchedPatta || "",
            dimensionAcres: "1.0",
          });
        }
      }
      return updated;
    });
  }, [watchedTotalPonds, watchedPatta]);

  // DB as Single Source of Truth: Fetch existing farm and ponds from MongoDB on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const sess = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      if (sess.farmerId) {
        axios
          .get(`/api/farms/${sess.farmerId}`)
          .then((res) => {
            if (res.data?.success && Array.isArray(res.data?.data) && res.data.data.length > 0) {
              const farm = res.data.data[0];
              const pCount = String(farm.totalPonds || farm.pondsCount || "1");
              reset({
                ownership: farm.ownership?.type || "owned",
                patta: farm.ownership?.patta || farm.patta || "",
                totalPonds: pCount,
              });

              if (farm.infrastructure) {
                setInfra({
                  filtration: farm.infrastructure.filtration ? "yes" : "no",
                  reservoir: farm.infrastructure.reservoir ? "yes" : "no",
                  farmFencing: farm.infrastructure.farmFencing ? "yes" : "no",
                  birdFencing: farm.infrastructure.birdFencing ? "yes" : "no",
                  dips: farm.infrastructure.dips ? "yes" : "no",
                  power: farm.infrastructure.power ? "yes" : "no",
                  aerators: farm.infrastructure.aerators ? "yes" : "no",
                  nursery: farm.infrastructure.nursery ? "yes" : "no",
                });
              }

              // Also fetch existing ponds for this farmer to fill per-pond survey numbers
              axios
                .get(`/api/farms/ponds?farmerId=${sess.farmerId}`)
                .then((pRes) => {
                  if (pRes.data?.success && Array.isArray(pRes.data?.data) && pRes.data.data.length > 0) {
                    const loadedPonds = pRes.data.data.map((p: any, idx: number) => ({
                      pondNumber: p.pondNumber || idx + 1,
                      name: p.name || `Pond ${idx + 1}`,
                      surveyNumber: p.surveyNumber || (farm.ownership?.patta ? `${farm.ownership.patta}/${idx + 1}` : ""),
                      pattaNumber: p.pattaNumber || farm.ownership?.patta || "",
                      dimensionAcres: String(p.dimensionAcres || "1.0"),
                    }));
                    setPondsList(loadedPonds);
                  }
                })
                .catch(() => {});
            }
          })
          .catch((err) => console.warn("Farm setup prefill warning:", err));
      }
    } catch (e) {
      console.error("Farm setup hydration error:", e);
    }
  }, [reset]);

  const toggleInfra = (field: string, value: string) => {
    setInfra((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePondChange = (pondNum: number, field: keyof PondConfig, val: string) => {
    setPondsList((prev) =>
      prev.map((p) => (p.pondNumber === pondNum ? { ...p, [field]: val } : p))
    );
  };

  const onSubmit = async (data: SetupForm) => {
    try {
      const session = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = session.farmerId;
      if (!farmerId) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      // Retrieve location from Step 4
      const locDraftStr = localStorage.getItem("draft_farm_location") || "{}";
      const loc = JSON.parse(locDraftStr);
      const totalPondsCount = Number(data.totalPonds) || pondsList.length || 1;

      const payload = {
        farmerId,
        location: {
          place: loc.taluk || "My Farm",
          taluk: loc.taluk || "",
          district: loc.district || "",
          state: loc.state || "",
        },
        latitude: loc.latitude || "13.0827",
        longitude: loc.longitude || "80.2707",
        ownership: {
          type: data.ownership,
          patta: data.patta,
        },
        totalPonds: totalPondsCount,
        pondsCount: totalPondsCount,
        ponds: pondsList.slice(0, totalPondsCount).map((p) => ({
          pondNumber: p.pondNumber,
          name: p.name || `Pond ${p.pondNumber}`,
          surveyNumber: p.surveyNumber || `${data.patta}/${p.pondNumber}`,
          pattaNumber: p.pattaNumber || data.patta,
          dimensionAcres: parseFloat(p.dimensionAcres) || 1.0,
        })),
        infrastructure: {
          filtration: infra.filtration === "yes",
          reservoir: infra.reservoir === "yes",
          farmFencing: infra.farmFencing === "yes",
          birdFencing: infra.birdFencing === "yes",
          dips: infra.dips === "yes",
          power: infra.power === "yes",
          aerators: infra.aerators === "yes",
          nursery: infra.nursery === "yes",
        },
      };

      const res = await axios.post("/api/farms", payload);

      if (res.data?.success) {
        const farmData = {
          farmId: res.data.data._id,
          ponds: res.data.ponds || [],
        };
        localStorage.setItem("aqua-farm", JSON.stringify(farmData));

        toast.success(isEditMode ? "Farm setup updated!" : "Ponds & Farm setup saved!");
        if (isEditMode) {
          navigate("/settings");
        } else {
          // Navigate to Step 6: Select Insured Ponds
          navigate("/insured-ponds");
        }
      }
    } catch (error: any) {
      console.error("Farm save error:", error);
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

      {/* SCROLLABLE INNER BODY */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-8">
        {/* REUSABLE 7-STEP HEADER (Step 5: Pond Registration) */}
        <RegistrationHeader
          currentStep={4}
          title="Pond Registration"
        />

        <div className="px-4 mt-5 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Ownership */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                {t("farm.ownershipType") || "Farm Ownership Type"}
              </label>
              <div className="flex gap-2">
                {["owned", "leased"].map((v) => {
                  const isActive = watch("ownership") === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      className={`flex-1 h-12 rounded-xl text-xs font-bold transition-all shadow-xs ${
                        isActive
                          ? "text-white border-transparent"
                          : "bg-white border text-stone-500 border-stone-200 hover:border-teal-200"
                      }`}
                      onClick={() => setValue("ownership", v, { shouldValidate: true })}
                      style={
                        isActive
                          ? {
                              background: "linear-gradient(110deg, #1c6b5a, #2d9b7f)",
                              boxShadow: "0 4px 12px -2px rgba(28,107,90,0.25)",
                            }
                          : {}
                      }
                    >
                      {v === "owned" ? "Owned Farm" : "Leased Land"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Farm Patta Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                Primary Farm Patta / Survey Number <span className="text-rose-500">*</span>
              </label>
              <Input
                {...register("patta")}
                placeholder="e.g. 104/A or Khata # 849"
                className={inputClasses}
              />
              {errors.patta && (
                <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.patta.message as string)}</p>
              )}
            </div>

            {/* Total Ponds Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                Total Ponds on Farm <span className="text-rose-500">*</span>
              </label>
              <Select
                onValueChange={(v) => setValue("totalPonds", v, { shouldValidate: true })}
                value={watch("totalPonds") || "1"}
              >
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder={t("farm.selectPonds")} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 20 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1} {i === 0 ? "Pond" : "Ponds"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Individual Pond Details (Survey No & Dimensions) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-teal-800">
                    Individual Pond Survey Details
                  </h2>
                  <p className="text-[11px] text-stone-500">
                    Specify distinct Survey / Patta number & size for each pond
                  </p>
                </div>
                <span className="text-xs font-extrabold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100">
                  {pondsList.length} Ponds
                </span>
              </div>

              <div className="space-y-3">
                {pondsList.map((pond) => (
                  <div
                    key={pond.pondNumber}
                    className="p-3.5 bg-white rounded-2xl border border-stone-200/80 shadow-xs space-y-3 transition-all hover:border-teal-300"
                  >
                    <div className="flex items-center gap-2 pb-1 border-b border-stone-100">
                      <div className="w-6 h-6 rounded-lg bg-teal-600 text-white font-extrabold text-xs flex items-center justify-center">
                        {pond.pondNumber}
                      </div>
                      <span className="text-xs font-bold text-stone-800">{pond.name}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-500">
                          Pond Survey / Dag No.
                        </label>
                        <Input
                          value={pond.surveyNumber}
                          onChange={(e) =>
                            handlePondChange(pond.pondNumber, "surveyNumber", e.target.value)
                          }
                          placeholder={`e.g. ${watchedPatta || "104"}/${pond.pondNumber}`}
                          className="h-10 text-xs rounded-lg bg-stone-50 border-stone-200"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-500">
                          Pond Size (Acres)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.1"
                          value={pond.dimensionAcres}
                          onChange={(e) =>
                            handlePondChange(pond.pondNumber, "dimensionAcres", e.target.value)
                          }
                          placeholder="1.0"
                          className="h-10 text-xs rounded-lg bg-stone-50 border-stone-200"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Infrastructure Checklist */}
            <div className="pt-2 border-t border-stone-100 space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                {t("farm.infrastructure") || "Farm Infrastructure"}
              </h2>

              <div className="divide-y divide-stone-100 bg-white rounded-2xl p-3 border border-stone-100 shadow-xs">
                {[
                  ["filtration", "Filtration facility"],
                  ["reservoir", "Reservoir system"],
                  ["farmFencing", "Farm perimeter fencing"],
                  ["birdFencing", "Bird netting / Fencing"],
                  ["dips", "Disinfection foot dips"],
                  ["power", "Generator / Power backup"],
                  ["aerators", "Adequate pond aerators"],
                  ["nursery", "Nursery pond setup"],
                ].map(([key, label], idx) => (
                  <div
                    key={key}
                    className={`flex justify-between items-center py-2.5 ${idx === 0 ? "pt-1" : ""}`}
                  >
                    <span className="text-xs font-medium text-stone-700">{label}</span>
                    <div className="flex bg-stone-100 rounded-lg p-0.5 gap-1">
                      <button
                        type="button"
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                          infra[key as keyof typeof infra] === "yes"
                            ? "bg-white text-teal-700 shadow-xs"
                            : "text-stone-400"
                        }`}
                        onClick={() => toggleInfra(key, "yes")}
                      >
                        {t("common.yes")}
                      </button>
                      <button
                        type="button"
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                          infra[key as keyof typeof infra] === "no"
                            ? "bg-white text-rose-600 shadow-xs"
                            : "text-stone-400"
                        }`}
                        onClick={() => toggleInfra(key, "no")}
                      >
                        {t("common.no")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/farm-registration")}
                className="flex-1 h-12 rounded-xl border-stone-200 text-stone-600 font-semibold"
              >
                ← Back to Location
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
                  "Next: Select Ponds →"
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
