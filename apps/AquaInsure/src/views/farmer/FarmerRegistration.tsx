import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mic, Upload, ScanLine, CheckCircle2, Loader2, Camera, Eye, Trash2, X } from "lucide-react";
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
import { uploadToSeaweedFS, resolveMediaUrl } from "@/lib/fileUtils";
import axios, { API_BASE_URL } from "@/lib/api";
import CameraCapture from "@/components/CameraCapture";

const personalSchema = z.object({
  name: z.string().min(2, "farmer.errors.name"),
  fatherName: z.string().min(2, "farmer.errors.fatherName"),
  phone: z.string().regex(/^[0-9]{10}$/, "farmer.errors.phone"),
  gender: z.string().optional(),
  isScSt: z.boolean().optional(),
  dob: z.string().optional(),
  photo: z.any().optional(),
  aadharFile: z.any().optional(),
});

type PersonalForm = z.infer<typeof personalSchema>;

export default function FarmerRegistration() {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = new URLSearchParams(location.search).get("mode") === "edit";
  const { t } = useTranslation();

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [existingPhoto, setExistingPhoto] = useState<any>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);
  const [aadharOcrLoading, setAadharOcrLoading] = useState(false);
  const [aadharOcrDone, setAadharOcrDone] = useState(false);
  const aadharInputRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<{ phone?: string; farmerId?: string; name?: string }>({});

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PersonalForm>({
    resolver: zodResolver(personalSchema as any),
    defaultValues: {
      phone: "",
      name: "",
      fatherName: "",
      gender: undefined,
      isScSt: false,
      dob: "",
    },
  });

  // DB as Single Source of Truth: Fetch farmer details directly from MongoDB on mount
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
      setSession(sess);

      axios
        .get(`/api/farmers/${sess.farmerId}`)
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            const f = res.data.data;
            if (f.identity?.photo) {
              setExistingPhoto(f.identity.photo);
            }
            reset({
              name: f.name && f.name !== 'New Farmer' ? f.name : "",
              fatherName: f.fatherName && f.fatherName !== 'N/A' ? f.fatherName : "",
              phone: f.phone || sess.phone || "",
              gender: f.gender || undefined,
              isScSt: !!f.isScSt,
              dob: f.dob ? f.dob.split("T")[0] : "",
            });
          }
        })
        .catch((err) => {
          console.warn("Could not load from backend, fallback to local storage:", err);
          const draftStr = localStorage.getItem("draft_farmer");
          if (draftStr) reset(JSON.parse(draftStr));
        });
    } catch (e) {
      console.error("Hydration error:", e);
    }
  }, [reset, setValue, navigate]);

  const formValues = watch();
  const watchedPhoto = watch("photo");

  useEffect(() => {
    if (watchedPhoto instanceof File) {
      const url = URL.createObjectURL(watchedPhoto);
      setLocalPhotoUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setLocalPhotoUrl(null);
    }
  }, [watchedPhoto]);

  const activePhotoUrl = localPhotoUrl || (existingPhoto ? resolveMediaUrl(existingPhoto) : null);

  // Cloud Autosave directly to DB
  const { syncStatus } = useAutoSave(formValues, async () => {
    const sess = session.farmerId ? session : JSON.parse(localStorage.getItem("aqua-session") || "{}");
    if (!sess.farmerId || !formValues.name) return;

    try {
      await axios.patch(`/api/farmers/${sess.farmerId}`, {
        name: formValues.name,
        fatherName: formValues.fatherName,
        phone: formValues.phone,
        gender: formValues.gender,
        isScSt: formValues.isScSt,
        dob: formValues.dob,
      });

      localStorage.setItem("aqua-session", JSON.stringify({ ...sess, name: formValues.name }));
      localStorage.setItem("shrimpguard-farmer", JSON.stringify({ name: formValues.name }));
    } catch (e) {
      console.error("Cloud autosave failed:", e);
      throw e;
    }
  });

  const onSubmit = async (data: PersonalForm) => {
    try {
      const sess = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = sess.farmerId;
      if (!farmerId) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      let photoMedia: any = null;
      if (data.photo instanceof File) {
        photoMedia = await uploadToSeaweedFS(data.photo, `farmers/${farmerId}/kyc`);
      }

      let aadharMedia: any = null;
      if (data.aadharFile instanceof File) {
        aadharMedia = await uploadToSeaweedFS(data.aadharFile, `farmers/${farmerId}/kyc`);
      }

      const payload: any = {
        name: data.name,
        fatherName: data.fatherName,
        phone: data.phone,
        gender: data.gender,
        isScSt: data.isScSt,
        dob: data.dob,
      };

      if (photoMedia) {
        payload.identity = { photo: photoMedia.key || photoMedia.url };
      } else if (existingPhoto) {
        payload.identity = { photo: existingPhoto };
      }

      if (aadharMedia) {
        payload.identity = {
          ...(payload.identity || {}),
          aadharFile: aadharMedia.key || aadharMedia.url,
        };
      }

      const res = await axios.patch(`/api/farmers/${farmerId}`, payload);

      if (res.data?.success) {
        localStorage.setItem("aqua-session", JSON.stringify({ ...sess, name: data.name }));
        localStorage.setItem("shrimpguard-farmer", JSON.stringify({ name: data.name }));

        toast.success(isEditMode ? "Profile updated" : "Personal details saved!");

        if (isEditMode) navigate("/settings");
        else navigate("/farmer-address");
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      toast.error(error.response?.data?.error || t("common.error"));
    }
  };

  const handleSpeak = (field: keyof PersonalForm) => {
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

  const handleAadhaarUpload = async (file: File | undefined) => {
    if (!file) return;
    setValue("aadharFile", file, { shouldDirty: true });
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
      if (d.name) setValue("name", d.name, { shouldDirty: true });
      if (d.gender) setValue("gender", d.gender, { shouldDirty: true });
      if (d.dob) setValue("dob", d.dob, { shouldDirty: true });
      if (d.fatherName) setValue("fatherName", d.fatherName, { shouldDirty: true });

      // Save extracted address to draft for Step 2
      if (d.address) {
        const addrDraft = {
          village: d.address.village || "",
          taluk: d.address.taluk || "",
          district: d.address.district || "",
          state: d.address.state || "",
          pinCode: d.address.pinCode || "",
        };
        localStorage.setItem("draft_farmer_address", JSON.stringify(addrDraft));
      }
      if (d.aadhaarNumber) {
        localStorage.setItem("draft_farmer_aadharNumber", d.aadhaarNumber);
      }

      setAadharOcrDone(true);
      toast.success("Aadhaar details extracted & auto-filled!");
    } catch (err: any) {
      toast.error("OCR scan could not read clearly. Please fill details manually.");
    } finally {
      setAadharOcrLoading(false);
    }
  };

  const renderField = (name: keyof PersonalForm, label: string, placeholder: string, type = "text") => (
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
          onCapture={(file) => setValue("photo", file, { shouldValidate: true, shouldDirty: true })}
          onClose={() => setIsCameraOpen(false)}
          title={t("farmer.capturePhoto")}
        />
      )}

      {/* SCROLLABLE INNER BODY */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-8">
        {/* REUSABLE 7-STEP HEADER (Step 1 Active) */}
        <RegistrationHeader
          currentStep={0}
          title={isEditMode ? "Edit Profile" : "Personal Details"}
          isEditMode={isEditMode}
          syncStatus={syncStatus}
        />

        <div className="px-4 mt-5 relative z-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ── AADHAAR SMART SCAN ── */}
            <div className="space-y-2 pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <ScanLine size={15} className="text-teal-600" />
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Aadhaar Auto-fill
                </p>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  Smart OCR
                </span>
              </div>
              <p className="text-[10px] text-stone-400 leading-snug">
                Upload Aadhaar card image/PDF — name, gender, & DOB will be auto-filled.
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
                  <Upload size={15} className={aadharOcrDone ? "text-teal-500" : "text-stone-400"} />
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
              {renderField("name", t("farmer.name"), "Enter farmer full name")}
              {renderField("fatherName", t("farmer.fatherName"), "Enter father's name")}
              {renderField("phone", t("farmer.phone"), "10-digit mobile number", "tel")}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 ml-0.5">Gender</label>
                <Select
                  onValueChange={(v) => setValue("gender", v, { shouldDirty: true })}
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-500 ml-0.5">
                    {t("farmer.photo")}
                  </label>
                  {activePhotoUrl && (
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      Photo Added ✓
                    </span>
                  )}
                </div>

                {activePhotoUrl ? (
                  <div className="flex items-center gap-3 p-3 rounded-2xl border border-teal-200 bg-teal-50/50 shadow-xs">
                    {/* Thumbnail with Click to Preview */}
                    <div
                      className="relative w-14 h-14 rounded-xl overflow-hidden border border-teal-300 shrink-0 cursor-pointer group shadow-xs bg-stone-100"
                      onClick={() => setPreviewPhotoModal(activePhotoUrl)}
                      title="Tap to preview photo"
                    >
                      <img
                        src={activePhotoUrl}
                        alt="Profile preview"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye size={16} className="text-white drop-shadow" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-800 truncate">
                        {watchedPhoto instanceof File
                          ? watchedPhoto.name
                          : "Profile Photo"}
                      </p>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        Tap thumbnail to preview
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoModal(activePhotoUrl)}
                          className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 transition-colors"
                        >
                          <Eye size={12} />
                          <span>Preview</span>
                        </button>
                        <span className="text-stone-300 text-xs">•</span>
                        <label className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer transition-colors">
                          <Upload size={12} />
                          <span>Change</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setValue("photo", file, { shouldDirty: true });
                            }}
                          />
                        </label>
                        <span className="text-stone-300 text-xs">•</span>
                        <button
                          type="button"
                          onClick={() => setIsCameraOpen(true)}
                          className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 transition-colors"
                        >
                          <Camera size={12} />
                          <span>Retake</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setValue("photo", undefined, { shouldDirty: true });
                        setExistingPhoto(null);
                      }}
                      className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-white/80 transition-colors"
                      title="Remove photo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-between h-12 px-4 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors">
                      <span className="text-sm text-stone-400 truncate max-w-[170px]">
                        {t("common.upload")}
                      </span>
                      <Upload size={16} className="text-teal-600 shrink-0 ml-2" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setValue("photo", e.target.files?.[0], { shouldDirty: true })}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCameraOpen(true)}
                      className="flex items-center justify-center w-14 h-12 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-teal-600 transition-colors"
                      title="Take photo with camera"
                    >
                      <Camera size={18} />
                    </button>
                  </div>
                )}
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
                ) : (
                  "Next: Address Details →"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Photo Preview Modal */}
      {previewPhotoModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setPreviewPhotoModal(null)}
        >
          <div
            className="relative max-w-lg w-full bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 z-[101]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-black/40">
              <div className="flex items-center gap-2">
                <Eye size={15} className="text-teal-400" />
                <span className="text-xs font-semibold tracking-wide text-white/90">Profile Photo Preview</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-stone-950/80 max-h-[75vh] overflow-hidden">
              <img
                src={previewPhotoModal}
                alt="Profile Preview"
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
