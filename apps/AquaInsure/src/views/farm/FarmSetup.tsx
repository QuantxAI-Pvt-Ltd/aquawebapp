import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Camera, Upload, X, Loader2 } from "lucide-react";
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
import SyncIndicator from "@/components/SyncIndicator";
import RegistrationHeader from "@/components/RegistrationHeader";
import { useAutoSave } from "@/hooks/useAutoSave";
import { uploadToSeaweedFS, resolveMediaUrl } from "@/lib/fileUtils";
import axios from "@/lib/api";
import CameraCapture from "@/components/CameraCapture";

const setupSchema = z.object({
  ownership: z.string().min(1, "farm.errors.ownership"),
  patta: z.string().min(1, "farm.errors.patta"),
  totalPonds: z.string().min(1, "farm.errors.ponds"),
  farmPhoto: z.any().optional(),
});

type SetupForm = z.infer<typeof setupSchema>;

export default function FarmSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [farmPhotoPreview, setFarmPhotoPreview] = useState<string | null>(null);

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

  const formValues = watch();
  const farmPhotoWatch = watch("farmPhoto");

  useEffect(() => {
    if (farmPhotoWatch instanceof File) {
      const url = URL.createObjectURL(farmPhotoWatch);
      setFarmPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof farmPhotoWatch === "string") {
      setFarmPhotoPreview(resolveMediaUrl(farmPhotoWatch));
    }
  }, [farmPhotoWatch]);

  const { syncStatus } = useAutoSave([formValues, infra]);

  const toggleInfra = (field: string, value: string) => {
    setInfra((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const onSubmit = async (data: SetupForm) => {
    try {
      const session = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = session.farmerId;
      if (!farmerId) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      toast.loading(t("common.saving"), { id: "farm-save" });

      // Retrieve location from Step 4
      const locDraftStr = localStorage.getItem("draft_farm_location") || "{}";
      const loc = JSON.parse(locDraftStr);

      let farmPhotoUrl: string | null = null;
      if (data.farmPhoto instanceof File) {
        const uploaded = await uploadToSeaweedFS(data.farmPhoto, `farmers/${farmerId}/farms`);
        farmPhotoUrl = uploaded?.key || uploaded?.url || null;
      } else if (typeof data.farmPhoto === "string") {
        farmPhotoUrl = data.farmPhoto;
      }

      const totalPondsCount = Number(data.totalPonds) || 1;

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
        farmPhoto: farmPhotoUrl,
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

        toast.dismiss("farm-save");
        toast.success(t("farm.saved") || "Farm setup saved to database!");
        navigate("/insurance-registration");
      }
    } catch (error: any) {
      toast.dismiss("farm-save");
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
      <SyncIndicator status={syncStatus} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

      {isCameraOpen && (
        <CameraCapture
          onCapture={(file) => setValue("farmPhoto", file, { shouldValidate: true })}
          onClose={() => setIsCameraOpen(false)}
          title={t("farm.uploadPhoto")}
          facingMode="environment"
        />
      )}

      {/* SCROLLABLE INNER BODY */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-8">
        {/* REUSABLE 7-STEP HEADER (Step 5 Active) */}
        <RegistrationHeader
          currentStep={4}
          title="Farm Setup & Infra"
          syncStatus={syncStatus}
        />

        <div className="px-4 mt-5 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Ownership */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                {t("farm.ownershipType") || "Ownership Type"}
              </label>
              <div className="flex gap-2">
                {["owned", "leased"].map((v) => {
                  const isActive = watch("ownership") === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      className={`flex-1 h-12 rounded-xl text-xs font-bold transition-all shadow-sm ${
                        isActive
                          ? "text-white shadow-sm border-transparent"
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

            {/* Patta */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                Patta / Survey Number <span className="text-rose-500">*</span>
              </label>
              <Input {...register("patta")} placeholder={t("farm.patta")} className={inputClasses} />
              {errors.patta && (
                <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.patta.message as string)}</p>
              )}
            </div>

            {/* Total Ponds */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                Total Ponds on Farm <span className="text-rose-500">*</span>
              </label>
              <Select
                onValueChange={(v) => setValue("totalPonds", v, { shouldValidate: true })}
                value={watch("totalPonds")}
              >
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder={t("farm.selectPonds")} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 30 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1} {i === 0 ? "Pond" : "Ponds"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.totalPonds && (
                <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.totalPonds.message as string)}</p>
              )}
            </div>

            {/* Farm Photo */}
            <div className="space-y-1.5 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  {t("farm.uploadPhoto") || "Farm Overview Photo"}
                </h2>
                <span className="text-[10px] text-stone-400 font-medium">Optional</span>
              </div>

              {farmPhotoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-900/5 aspect-video flex items-center justify-center">
                  <img src={farmPhotoPreview} alt="Farm Overview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setValue("farmPhoto", null, { shouldValidate: true });
                      setFarmPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition"
                  >
                    <Camera size={18} className="text-teal-600" />
                    <span className="text-xs font-bold">Take Photo</span>
                  </button>
                  <label className="flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-xl border border-dashed border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 cursor-pointer transition">
                    <Upload size={18} className="text-stone-500" />
                    <span className="text-xs font-bold">Upload File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setValue("farmPhoto", f, { shouldValidate: true });
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Infrastructure Checklist */}
            <div className="pt-2 border-t border-stone-100 space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                {t("farm.infrastructure")}
              </h2>

              <div className="divide-y divide-stone-100 bg-white rounded-2xl p-3 border border-stone-100 shadow-sm">
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
                            ? "bg-white text-teal-700 shadow-sm"
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
                            ? "bg-white text-rose-600 shadow-sm"
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
                  "Next: Insurance Setup →"
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
