import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mic, Upload, ScanLine, CheckCircle2, Loader2, Camera } from "lucide-react";
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
import axios, { API_BASE_URL } from "@/lib/api";
import CameraCapture from "@/components/CameraCapture";
import { LOCATIONS, STATES } from "@/constants/locations";

const farmerSchema = z.object({
  name: z.string().min(2, "farmer.errors.name"),
  fatherName: z.string().min(2, "farmer.errors.fatherName"),
  phone: z.string().regex(/^[0-9]{10}$/, "farmer.errors.phone"),
  gender: z.string().optional(),
  isScSt: z.boolean().optional(),
  dob: z.string().optional(),
  community: z.string().optional(),
  village: z.string().min(1, "farmer.errors.village"),
  taluk: z.string().min(1, "farmer.errors.taluk"),
  district: z.string().min(1, "farmer.errors.district"),
  state: z.string().min(1, "farmer.errors.state"),
  pinCode: z.string().regex(/^[0-9]{6}$/, "farmer.errors.pinCode"),
  regType: z.string().optional(),
  regNumber: z.string().optional(),
  regCertificate: z.any().optional(),
  aadharNumber: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{12}$/.test(val), {
      message: "farmer.errors.aadhar",
    }),
  aadharFile: z.any().optional(),
  hasPan: z.string().optional(),
  panNumber: z.string().optional(),
  panFile: z.any().optional(),
  photo: z.any().optional(),
  accountHolderName: z.string().optional(),
  bankName: z.string().optional(),
  branch: z.string().optional(),
  accountType: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
});

type FarmerForm = z.infer<typeof farmerSchema>;

export default function FarmerRegistration() {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = new URLSearchParams(location.search).get("mode") === "edit";
  const { t } = useTranslation();

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [aadharOcrLoading, setAadharOcrLoading] = useState(false);
  const [aadharOcrDone, setAadharOcrDone] = useState(false);
  const aadharInputRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<{ phone?: string; farmerId?: string; token?: string }>({});

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FarmerForm>({
    resolver: zodResolver(farmerSchema as any),
    defaultValues: {
      phone: "",
      name: "",
      fatherName: "",
      gender: undefined,
      isScSt: false,
      dob: "",
      community: "",
      village: "",
      taluk: "",
      district: "",
      state: "",
      pinCode: "",
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

  // Rehydrate draft and session safely on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isEditMode && localStorage.getItem("aqua-reg-complete") === "1") {
      navigate("/entries/daily", { replace: true });
      return;
    }

    try {
      const sess = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      setSession(sess);

      if (isEditMode && sess.farmerId) {
        axios
          .get(`/api/farmers/${sess.farmerId}`)
          .then((res) => {
            if (res.data?.success && res.data?.data) {
              const f = res.data.data;
              reset({
                name: f.name || "",
                fatherName: f.fatherName || "",
                phone: f.phone || sess.phone || "",
                gender: f.gender || undefined,
                isScSt: !!f.isScSt,
                dob: f.dob ? f.dob.split("T")[0] : "",
                community: f.community || "",
                village: f.address?.village || "",
                taluk: f.address?.taluk || "",
                district: f.address?.district || "",
                state: f.address?.state || "",
                pinCode: f.address?.pinCode || "",
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
          .catch((err) => {
            console.error("Error hydrating farmer for edit:", err);
            toast.error("Failed to load profile details");
          });
      } else {
        const draftStr = localStorage.getItem("draft_farmer");
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          reset({ ...draft, phone: sess.phone || draft.phone || "" });
        } else if (sess.phone) {
          setValue("phone", sess.phone);
        }
      }
    } catch (e) {
      console.error("Error hydrating draft_farmer:", e);
    }
  }, [navigate, reset, setValue, isEditMode]);

  const formValues = watch();

  useEffect(() => {
    const draft = { ...formValues };
    delete (draft as any).regCertificate;
    delete (draft as any).aadharFile;
    delete (draft as any).panFile;
    delete (draft as any).photo;
    localStorage.setItem("draft_farmer", JSON.stringify(draft));
  }, [formValues]);

  const { syncStatus } = useAutoSave(formValues, async () => {
    const currentSession = session.farmerId
      ? session
      : JSON.parse(localStorage.getItem("aqua-session") || "{}");
    if (!currentSession.farmerId) return;
    try {
      await axios.patch(`/api/farmers/${currentSession.farmerId}`, {
        name: formValues.name,
        fatherName: formValues.fatherName,
        phone: formValues.phone,
        address: {
          village: formValues.village,
          taluk: formValues.taluk,
          district: formValues.district,
          state: formValues.state,
          pinCode: formValues.pinCode,
        },
      });
      if (formValues.name) {
        localStorage.setItem(
          "aqua-session",
          JSON.stringify({ ...currentSession, name: formValues.name })
        );
        localStorage.setItem(
          "shrimpguard-farmer",
          JSON.stringify({ name: formValues.name })
        );
      }
    } catch (e) {
      console.error("Cloud autosave failed", e);
      throw e;
    }
  });

  const selectedState = watch("state");
  const districts = selectedState ? LOCATIONS[selectedState] || [] : [];

  const onSubmit = async (data: FarmerForm) => {
    try {
      toast.loading(t("common.saving"), { id: "farmer-save" });

      const currentSession = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = currentSession.farmerId;
      if (!farmerId) {
        toast.dismiss("farmer-save");
        toast.error("Session expired. Please login again.");
        return;
      }

      const [regCertMedia, aadharMedia, panMedia, photoMedia] = await Promise.all([
        data.regCertificate instanceof File
          ? uploadToSeaweedFS(data.regCertificate, `farmers/${farmerId}/kyc`)
          : data.regCertificate
          ? { url: data.regCertificate }
          : null,
        data.aadharFile instanceof File
          ? uploadToSeaweedFS(data.aadharFile, `farmers/${farmerId}/kyc`)
          : data.aadharFile
          ? { url: data.aadharFile }
          : null,
        data.panFile instanceof File
          ? uploadToSeaweedFS(data.panFile, `farmers/${farmerId}/kyc`)
          : data.panFile
          ? { url: data.panFile }
          : null,
        data.photo instanceof File
          ? uploadToSeaweedFS(data.photo, `farmers/${farmerId}/kyc`)
          : data.photo
          ? { url: data.photo }
          : null,
      ]);

      const getMediaVal = (m: any): string | null => (m ? m.key || m.url || null : null);

      const payload = {
        name: data.name,
        fatherName: data.fatherName,
        phone: data.phone,
        dob: data.dob,
        community: data.community,
        gender: data.gender,
        isScSt: data.isScSt,
        registration: {
          regType: data.regType,
          regNumber: data.regNumber?.trim() || undefined,
          regCertificate: getMediaVal(regCertMedia),
        },
        identity: {
          aadharNumber: data.aadharNumber?.trim() || undefined,
          aadharFile: getMediaVal(aadharMedia),
          hasPan: data.hasPan === "yes",
          panNumber: data.panNumber?.trim() || undefined,
          panFile: getMediaVal(panMedia),
          photo: getMediaVal(photoMedia),
        },
        address: {
          village: data.village,
          taluk: data.taluk,
          district: data.district,
          state: data.state,
          pinCode: data.pinCode,
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

      const res = await axios.patch(`/api/farmers/${farmerId}`, payload);

      if (res.data.success) {
        localStorage.setItem(
          "aqua-session",
          JSON.stringify({ ...currentSession, name: data.name })
        );
        localStorage.setItem(
          "shrimpguard-farmer",
          JSON.stringify({ name: data.name })
        );
        toast.dismiss("farmer-save");
        toast.success(isEditMode ? "Profile updated successfully" : t("farmer.saved"));

        if (isEditMode) {
          navigate("/settings");
        } else {
          navigate("/farm-registration");
        }
      }
    } catch (error: any) {
      toast.dismiss("farmer-save");
      console.error("Submission error:", error);
      toast.error(error.response?.data?.error || t("common.error"));
    }
  };

  const handleSpeak = (field: keyof FarmerForm) => {
    if (!("webkitSpeechRecognition" in window)) {
      toast.error(t("common.speechError"));
      return;
    }
    const SR: any = (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = localStorage.getItem("shrimpguard-lang") === "ta" ? "ta-IN" : "en-IN";
    recognition.onresult = (e: any) => {
      setValue(field, e.results[0][0].transcript);
    };
    recognition.start();
    toast.info(t("common.listening"));
  };

  const handleAadhaarUpload = async (file: File | undefined) => {
    if (!file) return;
    setValue("aadharFile", file);
    setAadharOcrLoading(true);
    setAadharOcrDone(false);
    try {
      const formData = new FormData();
      formData.append("aadhaar", file);
      const res = await fetch(`${API_BASE_URL}/api/farmers/ocr/aadhaar`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "OCR extraction failed");
      }
      const d = json.data || {};
      if (d.name) setValue("name", d.name);
      if (d.gender) setValue("gender", d.gender);
      if (d.dob) setValue("dob", d.dob);
      if (d.fatherName) setValue("fatherName", d.fatherName);
      if (d.address?.village) setValue("village", d.address.village);
      if (d.address?.taluk) setValue("taluk", d.address.taluk);
      if (d.address?.district) setValue("district", d.address.district);
      if (d.address?.state) setValue("state", d.address.state);
      if (d.address?.pinCode) setValue("pinCode", d.address.pinCode);
      if (d.aadhaarNumber) setValue("aadharNumber", d.aadhaarNumber);
      setAadharOcrDone(true);
      toast.success("Aadhaar details extracted and autofilled!");
    } catch (err: any) {
      toast.error("OCR failed. Please fill details manually.");
    } finally {
      setAadharOcrLoading(false);
    }
  };

  const renderField = (name: keyof FarmerForm, label: string, placeholder: string, type = "text") => (
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

      {isCameraOpen && (
        <CameraCapture
          onCapture={(file) => setValue("photo", file, { shouldValidate: true })}
          onClose={() => setIsCameraOpen(false)}
          title={t("farmer.capturePhoto")}
        />
      )}

      {/* SCROLLABLE INNER BODY */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-8">
        {/* REUSABLE HEADER WITH STEP 1 ACTIVE */}
        <RegistrationHeader
          currentStep={0}
          title={isEditMode ? "Edit Profile" : "Farmer Registration"}
          isEditMode={isEditMode}
          syncStatus={syncStatus}
        />

        <div className="px-4 mt-5 relative z-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* ── AADHAAR QUICK SCAN ── */}
            <div className="space-y-2 pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <ScanLine size={15} className="text-teal-600" />
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Aadhaar Card Auto-fill
                </p>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  Smart Scan
                </span>
              </div>
              <p className="text-[10px] text-stone-400 leading-snug">
                Upload Aadhaar card image or PDF — name & details will be auto-filled.
              </p>

              <label
                className={`relative flex items-center justify-between h-14 px-4 rounded-xl border-2 cursor-pointer transition-all ${
                  aadharOcrDone
                    ? "border-teal-400 bg-teal-50"
                    : aadharOcrLoading
                    ? "border-amber-300 bg-amber-50"
                    : "border-dashed border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-teal-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  {aadharOcrLoading ? (
                    <Loader2 size={18} className="text-amber-500 animate-spin" />
                  ) : aadharOcrDone ? (
                    <CheckCircle2 size={18} className="text-teal-500" />
                  ) : (
                    <ScanLine size={18} className="text-stone-400" />
                  )}
                  <span
                    className={`text-sm font-medium truncate max-w-[200px] ${
                      aadharOcrDone
                        ? "text-teal-700"
                        : aadharOcrLoading
                        ? "text-amber-600"
                        : "text-stone-400"
                    }`}
                  >
                    {aadharOcrLoading
                      ? "Reading Aadhaar…"
                      : aadharOcrDone
                      ? watch("aadharFile") instanceof File
                        ? (watch("aadharFile") as File).name
                        : "Aadhaar scanned ✓"
                      : "Tap to scan Aadhaar card"}
                  </span>
                </div>
                {!aadharOcrLoading && (
                  <Upload
                    size={15}
                    className={aadharOcrDone ? "text-teal-500" : "text-stone-400"}
                  />
                )}
                <input
                  ref={aadharInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  className="hidden"
                  disabled={aadharOcrLoading}
                  onChange={(e) => handleAadhaarUpload(e.target.files?.[0])}
                />
              </label>
            </div>

            {/* BASIC DETAILS */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Personal Details
              </h3>
              {renderField("name", t("farmer.name"), "Enter farmer full name")}
              {renderField("fatherName", t("farmer.fatherName"), "Enter father's name")}
              {renderField("phone", t("farmer.phone"), "10-digit mobile number", "tel")}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 ml-0.5">Gender</label>
                <Select
                  onValueChange={(v) => setValue("gender", v)}
                  value={watch("gender") || ""}
                >
                  <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm">
                    <SelectValue placeholder={t("farmer.gender", "Select Gender")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-center gap-3 h-12 px-4 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors">
                <input
                  type="checkbox"
                  {...register("isScSt")}
                  className="w-4 h-4 accent-teal-600 cursor-pointer"
                />
                <span className="text-sm text-stone-600 font-medium">{t("farmer.scst")}</span>
              </label>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 ml-0.5">
                  {t("farmer.dob")}
                </label>
                <Input
                  type="date"
                  {...register("dob")}
                  className="h-12 rounded-xl text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25 focus-visible:border-teal-500"
                />
              </div>

              {/* Farmer Photo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 ml-0.5">
                  {t("farmer.photo")}
                </label>
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-between h-12 px-4 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors">
                    <span className="text-sm text-stone-400 truncate max-w-[170px]">
                      {watch("photo")
                        ? watch("photo") instanceof File
                          ? (watch("photo") as File).name
                          : "Photo selected"
                        : t("common.upload")}
                    </span>
                    <Upload size={16} className="text-teal-600 shrink-0 ml-2" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setValue("photo", e.target.files?.[0])}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="flex items-center justify-center w-14 h-12 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-teal-600 transition-colors"
                  >
                    <Camera size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* ADDRESS DETAILS */}
            <div className="pt-3 border-t border-stone-100 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Address Details
              </h3>
              {renderField("village", t("farmer.village"), "Enter village name")}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 ml-0.5">State</label>
                <Select
                  onValueChange={(v) => {
                    setValue("state", v, { shouldValidate: true });
                    setValue("district", "");
                    setValue("taluk", "");
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
                  <p className="text-red-500 text-[10px] mt-1 pl-1">
                    {t(errors.state.message as string)}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 ml-0.5">District</label>
                <Select
                  onValueChange={(v) => {
                    setValue("district", v, { shouldValidate: true });
                    setValue("taluk", "");
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
                  <p className="text-red-500 text-[10px] mt-1 pl-1">
                    {t(errors.district.message as string)}
                  </p>
                )}
              </div>

              {renderField("taluk", t("farmer.taluk"), "Enter taluk / mandal")}
              {renderField("pinCode", t("farmer.pinCode"), "6-digit PIN code", "tel")}
            </div>

            {/* IDENTITY & BANK */}
            <div className="pt-3 border-t border-stone-100 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Identity & Bank Details
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 ml-0.5">
                  Registration Authority
                </label>
                <Select
                  onValueChange={(v) => setValue("regType", v)}
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
                  onValueChange={(v) => setValue("hasPan", v)}
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
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => (isEditMode ? navigate("/settings") : navigate("/dashboard"))}
                className="flex-1 h-12 rounded-xl border-stone-200 text-stone-600 font-semibold"
              >
                Cancel
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
                ) : isEditMode ? (
                  "Save Changes"
                ) : (
                  "Next: Farm Details →"
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
