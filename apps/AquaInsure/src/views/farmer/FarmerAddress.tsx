import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mic, Loader2 } from "lucide-react";
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

const addressSchema = z.object({
  village: z.string().min(1, "farmer.errors.village"),
  taluk: z.string().min(1, "farmer.errors.taluk"),
  district: z.string().min(1, "farmer.errors.district"),
  state: z.string().min(1, "farmer.errors.state"),
  pinCode: z.string().regex(/^[0-9]{6}$/, "farmer.errors.pinCode"),
});

type AddressForm = z.infer<typeof addressSchema>;

export default function FarmerAddress() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [session, setSession] = useState<{ farmerId?: string }>({});

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema as any),
    defaultValues: {
      village: "",
      taluk: "",
      district: "",
      state: "",
      pinCode: "",
    },
  });

  // DB as Single Source of Truth: Fetch address from MongoDB on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const sess = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      setSession(sess);

      if (sess.farmerId) {
        axios
          .get(`/api/farmers/${sess.farmerId}`)
          .then((res) => {
            if (res.data?.success && res.data?.data) {
              const f = res.data.data;
              if (f.address) {
                reset({
                  village: f.address.village || "",
                  taluk: f.address.taluk || "",
                  district: f.address.district || "",
                  state: f.address.state || "",
                  pinCode: f.address.pinCode || "",
                });
                return;
              }
            }
          })
          .catch((err) => console.warn("Backend address fetch:", err));
      }

      // Check draft extracted from Aadhaar OCR
      const draftAddr = localStorage.getItem("draft_farmer_address");
      if (draftAddr) {
        reset(JSON.parse(draftAddr));
      }
    } catch (e) {
      console.error("Address hydration error:", e);
    }
  }, [reset]);

  const formValues = watch();
  const selectedState = watch("state");
  const districts = selectedState ? LOCATIONS[selectedState] || [] : [];

  // Cloud Autosave directly to DB
  const { syncStatus } = useAutoSave(formValues, async () => {
    const sess = session.farmerId ? session : JSON.parse(localStorage.getItem("aqua-session") || "{}");
    if (!sess.farmerId || !formValues.village) return;

    try {
      await axios.patch(`/api/farmers/${sess.farmerId}`, {
        address: {
          village: formValues.village,
          taluk: formValues.taluk,
          district: formValues.district,
          state: formValues.state,
          pinCode: formValues.pinCode,
        },
      });
    } catch (e) {
      console.error("Address autosave failed:", e);
      throw e;
    }
  });

  const onSubmit = async (data: AddressForm) => {
    try {
      toast.loading(t("common.saving"), { id: "address-save" });

      const sess = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = sess.farmerId;
      if (!farmerId) {
        toast.dismiss("address-save");
        toast.error("Session expired. Please log in again.");
        return;
      }

      const res = await axios.patch(`/api/farmers/${farmerId}`, {
        address: {
          village: data.village,
          taluk: data.taluk,
          district: data.district,
          state: data.state,
          pinCode: data.pinCode,
        },
      });

      if (res.data?.success) {
        toast.dismiss("address-save");
        toast.success("Address details saved!");
        navigate("/farmer-kyc");
      }
    } catch (error: any) {
      toast.dismiss("address-save");
      console.error("Address submission error:", error);
      toast.error(error.response?.data?.error || t("common.error"));
    }
  };

  const handleSpeak = (field: keyof AddressForm) => {
    if (!("webkitSpeechRecognition" in window)) {
      toast.error(t("common.speechError"));
      return;
    }
    const SR: any = (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = localStorage.getItem("shrimpguard-lang") === "ta" ? "ta-IN" : "en-IN";
    recognition.onresult = (e: any) => {
      setValue(field, e.results[0][0].transcript, { shouldDirty: true });
    };
    recognition.start();
    toast.info(t("common.listening"));
  };

  const renderField = (name: keyof AddressForm, label: string, placeholder: string, type = "text") => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-stone-500 ml-0.5">{label}</label>
      <div className="relative">
        <Input
          {...register(name)}
          placeholder={placeholder}
          type={type}
          className="h-12 rounded-xl text-base sm:text-sm pr-11 border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25 focus-visible:border-teal-500 placeholder:text-stone-400"
        />
        <button
          type="button"
          onClick={() => handleSpeak(name)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-teal-600 hover:text-teal-700 transition-colors bg-transparent border-0 p-1"
        >
          <Mic size={16} />
        </button>
      </div>
      {errors[name] && (
        <p className="text-red-500 text-xs mt-1 pl-0.5">{t(errors[name]?.message as string)}</p>
      )}
    </div>
  );

  return (
    <div
      className="h-full flex flex-col overflow-hidden bg-stone-50 relative text-stone-800 font-sans"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <SyncIndicator status={syncStatus} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

      {/* SCROLLABLE INNER BODY */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-8">
        {/* REUSABLE 7-STEP HEADER (Step 2 Active) */}
        <RegistrationHeader
          currentStep={1}
          title="Farmer Address"
          syncStatus={syncStatus}
        />

        <div className="px-4 mt-5 relative z-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {renderField("village", t("farmer.village"), "Enter village name")}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">State</label>
              <Select
                onValueChange={(v) => {
                  setValue("state", v, { shouldValidate: true, shouldDirty: true });
                  setValue("district", "", { shouldDirty: true });
                  setValue("taluk", "", { shouldDirty: true });
                }}
                value={watch("state")}
              >
                <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4 shadow-sm">
                  <SelectValue placeholder={t("farmer.state")} />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-red-500 text-[10px] mt-1 pl-1">{t(errors.state.message as string)}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">District</label>
              <Select
                onValueChange={(v) => {
                  setValue("district", v, { shouldValidate: true, shouldDirty: true });
                  setValue("taluk", "", { shouldDirty: true });
                }}
                value={watch("district")}
                disabled={!selectedState}
              >
                <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4 shadow-sm">
                  <SelectValue placeholder={t("farmer.district")} />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.district && (
                <p className="text-red-500 text-[10px] mt-1 pl-1">{t(errors.district.message as string)}</p>
              )}
            </div>

            {renderField("taluk", t("farmer.taluk"), "Enter taluk / mandal")}
            {renderField("pinCode", t("farmer.pinCode"), "6-digit PIN code", "tel")}

            {/* ACTION BUTTONS */}
            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/farmer-registration")}
                className="flex-1 h-12 rounded-xl border-stone-200 text-stone-600 font-semibold"
              >
                ← Back to Personal
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
                  "Next: Bank & KYC →"
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
