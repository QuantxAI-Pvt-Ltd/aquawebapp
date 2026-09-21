import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ChevronLeft, MapPin, Camera, Upload, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import BottomNav from "@/components/BottomNav";
import SyncIndicator from "@/components/SyncIndicator";
import { useAutoSave } from "@/hooks/useAutoSave";
import { fileToBase64, resolveMediaUrl } from "@/lib/fileUtils";
import axios from "@/lib/api";
import CameraCapture from "@/components/CameraCapture";
import { LOCATIONS, STATES } from "@/constants/locations";

const farmSchema = z.object({
  place: z.string().min(1, "farm.errors.place"),
  taluk: z.string().min(1, "farm.errors.taluk"),
  district: z.string().min(1, "farm.errors.district"),
  state: z.string().min(1, "farm.errors.state"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  ownership: z.string().min(1, "farm.errors.ownership"),
  patta: z.string().min(1, "farm.errors.patta"),
  totalPonds: z.string().min(1, "farm.errors.ponds"),
  farmPhoto: z.any().optional()
});

type FarmForm = z.infer<typeof farmSchema>;

export default function FarmRegistration() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [farmPhotoPreview, setFarmPhotoPreview] = useState<string | null>(null);

  const [infra, setInfra] = useState(() => {
    const draftStr = localStorage.getItem("draft_farm_infra");
    if (draftStr) {
      try { return JSON.parse(draftStr); } catch(e) {}
    }
    return {
      filtration: "",
      reservoir: "",
      farmFencing: "",
      birdFencing: "",
      dips: "",
      power: "",
      aerators: "",
      nursery: ""
    };
  });

  // Guard: if registration is already complete, skip back to daily entry
  useEffect(() => {
    if (localStorage.getItem('aqua-reg-complete') === '1') {
      navigate('/entries/daily', { replace: true });
    }
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<FarmForm>({
    resolver: zodResolver(farmSchema as any),
    defaultValues: (() => {
      const draftStr = localStorage.getItem("draft_farm_form");
      if (draftStr) {
        try {
          return JSON.parse(draftStr);
        } catch(e) {}
      }
      return { ownership: "owned" };
    })()
  });

  const formValues = watch();

  const farmPhotoWatch = watch("farmPhoto");

  useEffect(() => {
    if (farmPhotoWatch instanceof File) {
      const url = URL.createObjectURL(farmPhotoWatch);
      setFarmPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof farmPhotoWatch === "string") {
      setFarmPhotoPreview(farmPhotoWatch);
    } else {
      setFarmPhotoPreview(null);
    }
  }, [farmPhotoWatch]);

  useEffect(() => {
    localStorage.setItem("draft_farm_infra", JSON.stringify(infra));
  }, [infra]);

  // Merge dependencies for autosave indicator (no cloud patch since Farm isn't created yet)
  const { syncStatus } = useAutoSave([formValues, infra]);

  const latitude = watch("latitude");
  const longitude = watch("longitude");
  const selectedState = watch("state");
  const selectedDistrict = watch("district");

  const districts = selectedState ? (LOCATIONS[selectedState] || []) : [];

  // Capture GPS
  const captureGeo = () => {
    if (!navigator.geolocation) {
      toast.error(t("farm.geoNotSupported") || "Geo location not supported");
      return;
    }

    toast.loading(t("common.capturing") || "Capturing...", { id: "geo" });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("latitude", pos.coords.latitude.toString());
        setValue("longitude", pos.coords.longitude.toString());
        toast.dismiss("geo");
        toast.success(t("farm.geoCaptured") || "Captured");
      },
      (err) => {
        toast.dismiss("geo");
        let errorMsg = t("farm.geoError") || "Error capturing geo";
        if (err.code === err.PERMISSION_DENIED) errorMsg = "Permission denied. Using fallback location.";
        else if (err.code === err.POSITION_UNAVAILABLE) errorMsg = "Location unavailable. Using fallback location.";
        else if (err.code === err.TIMEOUT) errorMsg = "Request timed out. Using fallback location.";
        toast.error(errorMsg);
        console.error("Geo error:", err);
        
        // Unblock testing on desktop by auto-filling dummy coordinates
        setValue("latitude", "13.0827"); // Chennai fallback
        setValue("longitude", "80.2707");
      }
    );
  };

  const toggleInfra = (field: string, value: string) => {
    setInfra((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const onSubmit = async (data: FarmForm) => {
    try {
      const session = JSON.parse(localStorage.getItem('aqua-session') || '{}');
      const farmerId = session.farmerId;
      if (!farmerId) {
        toast.error("Session expired. Please login again.");
        return;
      }

      toast.loading(t("common.saving"), { id: 'farm-save' });

      const farmPhotoBase64 = data.farmPhoto ? await fileToBase64(data.farmPhoto) : null;

      const payload = {
        farmerId,
        location: {
          place: data.place,
          taluk: data.taluk,
          district: data.district,
          state: data.state,
        },
        latitude: data.latitude,
        longitude: data.longitude,
        ownership: {
          type: data.ownership,
          patta: data.patta
        },
        totalPonds: Number(data.totalPonds),
        pondsCount: Number(data.totalPonds),
        farmPhoto: farmPhotoBase64 || null,
        infrastructure: {
          filtration: infra.filtration === "yes",
          reservoir: infra.reservoir === "yes",
          farmFencing: infra.farmFencing === "yes",
          birdFencing: infra.birdFencing === "yes",
          dips: infra.dips === "yes",
          power: infra.power === "yes",
          aerators: infra.aerators === "yes",
          nursery: infra.nursery === "yes"
        }
      };

      const res = await axios.post("/api/farms", payload);

      if (res.data.success) {
        // Save the generated IDs to pass to the next screens
        const farmData = {
          farmId: res.data.data._id,
          ponds: res.data.ponds
        };
        localStorage.setItem("aqua-farm", JSON.stringify(farmData));

        toast.dismiss('farm-save');
        toast.success(t("farm.saved") || "Saved");

        localStorage.removeItem("draft_farm_form");
        localStorage.removeItem("draft_farm_infra");

        navigate("/insurance-registration");
      }
    } catch (error: any) {
      toast.dismiss('farm-save');
      console.error('Farm submission error:', error);
      toast.error(error.response?.data?.error || t('common.error'));
    }
  };

  const inputClasses = "h-12 rounded-xl text-base sm:text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25 focus-visible:border-teal-500 placeholder:text-stone-300";

  return (
    <div className="min-h-[100dvh] bg-stone-50 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] text-stone-800 font-sans">
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

      {/* HEADER */}
      <div className="px-5 pt-8 pb-8 rounded-b-[2.5rem] relative overflow-hidden"
        style={{
          background: 'linear-gradient(140deg, #1c4a3e 0%, #1c6b5a 45%, #2d9b7f 100%)',
          boxShadow: '0 8px 32px -6px rgba(28,74,62,0.28)',
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 opacity-10"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-white tracking-tight">
              {t("farm.title")}
            </h1>
          </div>
          <span className={`text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15 transition-opacity duration-200 ${syncStatus !== 'idle' ? 'opacity-0' : 'opacity-100'}`}>
            Aqua <span className="text-amber-300">AI</span>nsure
          </span>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 space-y-3 border border-stone-100 shadow-sm"
          >
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
              {t("farm.locationDetails") || "Location Details"}
            </h2>

            <div className="space-y-4">
              
              {/* State */}
              <div>
                <Select 
                  onValueChange={(v) => {
                    setValue("state", v, { shouldValidate: true });
                    setValue("district", "");
                    setValue("taluk", "");
                  }} 
                  value={watch("state")}
                >
                  <SelectTrigger className={inputClasses}>
                    <SelectValue placeholder={t("farmer.state")} />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.state && <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.state.message as string)}</p>}
              </div>

              {/* District */}
              <div>
                <Select 
                  onValueChange={(v) => {
                    setValue("district", v, { shouldValidate: true });
                    setValue("taluk", "");
                  }} 
                  value={watch("district")}
                  disabled={!selectedState}
                >
                  <SelectTrigger className={inputClasses}>
                    <SelectValue placeholder={t("farm.district")} />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.district && <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.district.message as string)}</p>}
              </div>

              {/* Taluk / Place */}
              <div>
                <Input {...register("taluk")} placeholder={t("farm.taluk")} className={inputClasses} />
                {errors.taluk && <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.taluk.message as string)}</p>}
              </div>

              <div>
                <Input {...register("place")} placeholder={t("farm.place")} className={inputClasses} />
                {errors.place && <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.place.message as string)}</p>}
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={captureGeo}
                  variant="outline"
                  className="w-full h-12 rounded-xl gap-2 border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-teal-600 shadow-sm transition-colors"
                >
                  <MapPin size={18} className="text-teal-500" />
                  {t("farm.captureGeo")}
                </Button>

                {latitude && longitude && (
                  <div className="mt-2 p-3 bg-teal-50 border border-teal-100 rounded-xl flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    <p className="text-xs font-medium text-teal-700">
                      {latitude}, {longitude}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 space-y-4 border border-stone-100 shadow-sm"
          >
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
              {t("farm.farmDetails") || "Farm Details"}
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-stone-500 ml-1">{t("farm.ownershipType") || "Ownership Type"}</p>
                <div className="flex gap-2">
                  {["owned", "leased"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`flex-1 h-12 rounded-xl text-xs font-bold transition-all shadow-sm ${watch("ownership") === v
                        ? "text-white shadow-sm border-transparent"
                        : "bg-white border text-stone-500 border-stone-200 hover:border-teal-200"
                        }`}
                      onClick={() =>
                        setValue("ownership", v, { shouldValidate: true })
                      }
                      style={watch("ownership") === v ? {
                        background: 'linear-gradient(110deg, #1c6b5a, #2d9b7f)',
                        boxShadow: '0 4px 12px -2px rgba(28,107,90,0.25)',
                      } : {}}
                    >
                      {t(`farm.${v}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Input {...register("patta")} placeholder={t("farm.patta")} className={inputClasses} />
                {errors.patta && <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.patta.message as string)}</p>}
              </div>

              <div>
                <Select onValueChange={(v) => setValue("totalPonds", v, { shouldValidate: true })} value={watch("totalPonds")}>
                  <SelectTrigger className={inputClasses}>
                    <SelectValue placeholder={t("farm.selectPonds")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 50 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1} {t("farm.ponds")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.totalPonds && <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.totalPonds.message as string)}</p>}
              </div>


            </div>
          </motion.div>

          {/* Farm Photo */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-5 space-y-3 border border-stone-100 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                {t("farm.uploadPhoto") || "Farm Overview Photo"}
              </h2>
              <span className="text-[10px] text-stone-300 font-medium">Optional</span>
            </div>

            {farmPhotoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-stone-200">
                <img
                  src={resolveMediaUrl(farmPhotoPreview) || farmPhotoPreview}
                  alt="Farm Overview"
                  className="w-full h-44 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-lg px-2.5 py-1">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span className="text-[11px] font-semibold text-white truncate max-w-[180px]">
                      {farmPhotoWatch?.name || "Farm Photo Captured"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setValue("farmPhoto", null, { shouldValidate: true });
                      setFarmPhotoPreview(null);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-500/80 backdrop-blur-sm text-white hover:bg-rose-600 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-5 space-y-2 border border-stone-100 shadow-sm"
          >
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
              {t("farm.infrastructure")}
            </h2>

            <div className="divide-y divide-stone-100">
              {[
                ["filtration", "Filtration facility"],
                ["reservoir", "Reservoir"],
                ["farmFencing", "Farm fencing"],
                ["birdFencing", "Bird fencing"],
                ["dips", "Disinfection dips"],
                ["power", "Power backup"],
                ["aerators", "Adequate aerators"],
                ["nursery", "Nursery"]
              ].map(([key, label], idx) => (
                <div key={key} className={`flex justify-between items-center py-3.5 ${idx === 0 ? "pt-0" : ""}`}>
                  <span className="text-sm font-medium text-stone-600">{t(`farm.${key}`) || label}</span>

                  <div className="flex bg-stone-100 rounded-lg p-0.5 gap-1">
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${infra[key as keyof typeof infra] === "yes"
                        ? "bg-white text-teal-700 shadow-sm"
                        : "text-stone-400"
                        }`}
                      onClick={() => toggleInfra(key, "yes")}
                    >
                      {t("common.yes")}
                    </button>

                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${infra[key as keyof typeof infra] === "no"
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
          </motion.div>

          <Button
            type="submit"
            className="w-full h-14 rounded-2xl text-white font-bold text-base"
            style={{
              background: 'linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)',
              boxShadow: '0 6px 24px -4px rgba(28,107,90,0.28)',
            }}
          >
            {t("common.next")}
          </Button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}