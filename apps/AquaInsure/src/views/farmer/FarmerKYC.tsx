import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, Loader2 } from "lucide-react";
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
import { uploadToSeaweedFS } from "@/lib/fileUtils";
import axios from "@/lib/api";

const kycSchema = z.object({
  regType: z.string().optional(),
  regNumber: z.string().optional(),
  regCertificate: z.any().optional(),
  aadharNumber: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{12}$/.test(val), {
      message: "farmer.errors.aadhar",
    }),
  hasPan: z.string().optional(),
  panNumber: z.string().optional(),
  panFile: z.any().optional(),
  accountHolderName: z.string().optional(),
  bankName: z.string().optional(),
  branch: z.string().optional(),
  accountType: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
});

type KYCForm = z.infer<typeof kycSchema>;

export default function FarmerKYC() {
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
  } = useForm<KYCForm>({
    resolver: zodResolver(kycSchema as any),
    defaultValues: {
      regType: undefined,
      regNumber: "",
      aadharNumber: "",
      hasPan: "no",
      panNumber: "",
      accountHolderName: "",
      bankName: "",
      branch: "",
      accountType: undefined,
      accountNumber: "",
      ifscCode: "",
    },
  });

  // DB as Single Source of Truth: Fetch KYC & Bank details from MongoDB on mount
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
              reset({
                regType: f.registration?.regType || undefined,
                regNumber: f.registration?.regNumber || "",
                aadharNumber: f.identity?.aadharNumber || "",
                hasPan: f.identity?.hasPan ? "yes" : "no",
                panNumber: f.identity?.panNumber || "",
                accountHolderName: f.bankDetails?.accountHolderName || "",
                bankName: f.bankDetails?.bankName || "",
                branch: f.bankDetails?.branch || "",
                accountType: f.bankDetails?.accountType || undefined,
                accountNumber: f.bankDetails?.accountNumber || "",
                ifscCode: f.bankDetails?.ifscCode || "",
              });
            }
          })
          .catch((err) => console.warn("Backend KYC fetch warning:", err));
      }

      const draftAadhaar = localStorage.getItem("draft_farmer_aadharNumber");
      if (draftAadhaar) {
        setValue("aadharNumber", draftAadhaar, { shouldDirty: true });
      }
    } catch (e) {
      console.error("KYC hydration error:", e);
    }
  }, [reset, setValue]);

  const formValues = watch();

  // Cloud Autosave directly to DB
  const { syncStatus } = useAutoSave(formValues, async () => {
    const sess = session.farmerId ? session : JSON.parse(localStorage.getItem("aqua-session") || "{}");
    if (!sess.farmerId) return;

    try {
      await axios.patch(`/api/farmers/${sess.farmerId}`, {
        registration: {
          regType: formValues.regType,
          regNumber: formValues.regNumber,
        },
        identity: {
          aadharNumber: formValues.aadharNumber,
          hasPan: formValues.hasPan === "yes",
          panNumber: formValues.panNumber,
        },
        bankDetails: {
          accountHolderName: formValues.accountHolderName,
          bankName: formValues.bankName,
          branch: formValues.branch,
          accountType: formValues.accountType,
          accountNumber: formValues.accountNumber,
          ifscCode: formValues.ifscCode,
        },
      });
    } catch (e) {
      console.error("KYC autosave failed:", e);
      throw e;
    }
  });

  const onSubmit = async (data: KYCForm) => {
    try {
      toast.loading(t("common.saving"), { id: "kyc-save" });

      const sess = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = sess.farmerId;
      if (!farmerId) {
        toast.dismiss("kyc-save");
        toast.error("Session expired. Please log in again.");
        return;
      }

      let regCertMedia: any = null;
      if (data.regCertificate instanceof File) {
        regCertMedia = await uploadToSeaweedFS(data.regCertificate, `farmers/${farmerId}/kyc`);
      }

      let panMedia: any = null;
      if (data.panFile instanceof File) {
        panMedia = await uploadToSeaweedFS(data.panFile, `farmers/${farmerId}/kyc`);
      }

      const payload: any = {
        registration: {
          regType: data.regType,
          regNumber: data.regNumber?.trim() || undefined,
        },
        identity: {
          aadharNumber: data.aadharNumber?.trim() || undefined,
          hasPan: data.hasPan === "yes",
          panNumber: data.panNumber?.trim() || undefined,
        },
        bankDetails: {
          accountHolderName: data.accountHolderName,
          bankName: data.bankName,
          branch: data.branch,
          accountType: data.accountType,
          accountNumber: data.accountNumber,
          ifscCode: data.ifscCode,
        },
      };

      if (regCertMedia) payload.registration.regCertificate = regCertMedia.key || regCertMedia.url;
      if (panMedia) payload.identity.panFile = panMedia.key || panMedia.url;

      const res = await axios.patch(`/api/farmers/${farmerId}`, payload);

      if (res.data?.success) {
        toast.dismiss("kyc-save");
        toast.success("Identity & Bank details saved!");
        navigate("/farm-registration");
      }
    } catch (error: any) {
      toast.dismiss("kyc-save");
      console.error("KYC submission error:", error);
      toast.error(error.response?.data?.error || t("common.error"));
    }
  };

  const renderField = (name: keyof KYCForm, label: string, placeholder: string, type = "text") => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-stone-500 ml-0.5">{label}</label>
      <Input
        {...register(name)}
        placeholder={placeholder}
        type={type}
        className="h-12 rounded-xl text-base sm:text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25 focus-visible:border-teal-500 placeholder:text-stone-400"
      />
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
        {/* REUSABLE 7-STEP HEADER (Step 3 Active) */}
        <RegistrationHeader
          currentStep={2}
          title="Identity & Bank KYC"
          syncStatus={syncStatus}
        />

        <div className="px-4 mt-5 relative z-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                Registration Authority
              </label>
              <Select
                onValueChange={(v) => setValue("regType", v, { shouldDirty: true })}
                value={watch("regType")}
              >
                <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4">
                  <SelectValue placeholder={t("farmer.registrationType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caa">CAA (Coastal Aquaculture Authority)</SelectItem>
                  <SelectItem value="mpeda">MPEDA</SelectItem>
                  <SelectItem value="dof">DoF (Department of Fisheries)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {renderField("regNumber", t("farmer.regNumber"), "Registration certificate number")}
            {renderField("aadharNumber", t("farmer.aadharNumber"), "12-digit Aadhaar number", "tel")}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 ml-0.5">
                {t("farmer.hasPan")}
              </label>
              <Select
                onValueChange={(v) => setValue("hasPan", v, { shouldDirty: true })}
                value={watch("hasPan")}
              >
                <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4">
                  <SelectValue placeholder={t("farmer.hasPan")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{t("common.yes")}</SelectItem>
                  <SelectItem value="no">{t("common.no")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {watch("hasPan") === "yes" &&
              renderField("panNumber", t("farmer.panNumber"), "Enter 10-digit PAN")}

            {/* Bank Details */}
            <div className="pt-2 border-t border-stone-100 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
                {t("farmer.bankDetails")}
              </p>
              {renderField("accountHolderName", t("farmer.accountHolderName"), "Name as in passbook")}
              {renderField("bankName", t("farmer.bankName"), "e.g. State Bank of India")}
              {renderField("branch", t("farmer.branch"), "Branch name")}
              {renderField("accountNumber", t("farmer.accountNumber"), "Account number", "tel")}
              {renderField("ifscCode", t("farmer.ifscCode"), "e.g. SBIN0001234")}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/farmer-address")}
                className="flex-1 h-12 rounded-xl border-stone-200 text-stone-600 font-semibold"
              >
                ← Back to Address
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
                  "Next: Farm Location →"
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
