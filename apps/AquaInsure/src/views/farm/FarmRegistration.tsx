import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Loader2 } from "lucide-react";
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
import axios from "@/lib/api";
import { LOCATIONS, STATES } from "@/constants/locations";

const locationSchema = z.object({
  state: z.string().min(1, "farm.errors.state"),
  district: z.string().min(1, "farm.errors.district"),
  taluk: z.string().min(1, "farm.errors.taluk"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

type LocationForm = z.infer<typeof locationSchema>;

export default function FarmRegistration() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LocationForm>({
    resolver: zodResolver(locationSchema as any),
    defaultValues: {
      state: "",
      district: "",
      taluk: "",
      latitude: "",
      longitude: "",
    },
  });

  // DB as Single Source of Truth: Fetch farm location or inherit from farmer address on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const sess = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      if (sess.farmerId) {
        axios
          .get(`/api/farmers/${sess.farmerId}`)
          .then((res) => {
            if (res.data?.success && res.data?.data) {
              const f = res.data.data;
              if (f.address) {
                reset({
                  state: f.address.state || "",
                  district: f.address.district || "",
                  taluk: f.address.taluk || f.address.village || "",
                  latitude: "",
                  longitude: "",
                });
              }
            }
          })
          .catch((err) => console.warn("Farmer address prefill:", err));
      }
    } catch (e) {
      console.error("Farm location hydration error:", e);
    }
  }, [reset]);

  const formValues = watch();
  const selectedState = watch("state");
  const districts = selectedState ? LOCATIONS[selectedState] || [] : [];
  const latitude = watch("latitude");
  const longitude = watch("longitude");

  const captureGeo = () => {
    if (!navigator.geolocation) {
      toast.error(t("farm.geoNotSupported") || "Geo location not supported");
      return;
    }

    toast.loading(t("common.capturing") || "Capturing GPS…", { id: "geo" });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("latitude", pos.coords.latitude.toFixed(6), { shouldDirty: true });
        setValue("longitude", pos.coords.longitude.toFixed(6), { shouldDirty: true });
        toast.dismiss("geo");
        toast.success(t("farm.geoCaptured") || "GPS captured!");
      },
      () => {
        toast.dismiss("geo");
        setValue("latitude", "13.0827", { shouldDirty: true });
        setValue("longitude", "80.2707", { shouldDirty: true });
        toast.info("Using fallback GPS coordinates.");
      }
    );
  };

  const { syncStatus } = useAutoSave(formValues);

  const onSubmit = async (data: LocationForm) => {
    try {
      toast.loading(t("common.saving"), { id: "loc-save" });

      const sess = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = sess.farmerId;
      if (!farmerId) {
        toast.dismiss("loc-save");
        toast.error("Session expired. Please log in again.");
        return;
      }

      // Save to localStorage draft for combining with Step 5
      localStorage.setItem("draft_farm_location", JSON.stringify(data));

      toast.dismiss("loc-save");
      toast.success("Farm location saved!");
      navigate("/farm-setup");
    } catch (error: any) {
      toast.dismiss("loc-save");
      console.error("Location save error:", error);
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
        {/* REUSABLE 7-STEP HEADER (Step 4 Active) */}
        <RegistrationHeader
          currentStep={3}
          title="Farm Location"
          syncStatus={syncStatus}
        />

        <div className="px-4 mt-5 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* State */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                State <span className="text-rose-500">*</span>
              </label>
              <Select
                onValueChange={(v) => {
                  setValue("state", v, { shouldValidate: true, shouldDirty: true });
                  setValue("district", "", { shouldDirty: true });
                  setValue("taluk", "", { shouldDirty: true });
                }}
                value={watch("state")}
              >
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder={t("farmer.state")} />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.state.message as string)}</p>
              )}
            </div>

            {/* District */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                District <span className="text-rose-500">*</span>
              </label>
              <Select
                onValueChange={(v) => {
                  setValue("district", v, { shouldValidate: true, shouldDirty: true });
                  setValue("taluk", "", { shouldDirty: true });
                }}
                value={watch("district")}
                disabled={!selectedState}
              >
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder={t("farm.district")} />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.district && (
                <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.district.message as string)}</p>
              )}
            </div>

            {/* Taluk / Place */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                Taluk / Village / Place <span className="text-rose-500">*</span>
              </label>
              <Input {...register("taluk")} placeholder="e.g. Sirkazhi" className={inputClasses} />
              {errors.taluk && (
                <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.taluk.message as string)}</p>
              )}
            </div>

            {/* GPS Capture */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                Farm Coordinates (GPS Pinning)
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={captureGeo}
                className="w-full h-12 rounded-xl gap-2 border-stone-200 text-stone-700 bg-stone-50 hover:bg-stone-100 font-semibold"
              >
                <MapPin size={18} className="text-teal-600" />
                {latitude && longitude
                  ? `GPS: ${latitude}, ${longitude}`
                  : t("farm.captureGeo") || "Capture Geo-Coordinates"}
              </Button>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/farmer-kyc")}
                className="flex-1 h-12 rounded-xl border-stone-200 text-stone-600 font-semibold"
              >
                ← Back to KYC
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
                  "Next: Farm Setup →"
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
