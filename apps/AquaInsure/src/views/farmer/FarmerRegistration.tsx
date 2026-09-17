import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Mic, Upload, ScanLine, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import SyncIndicator from "@/components/SyncIndicator";
import { useAutoSave } from "@/hooks/useAutoSave";
import { fileToBase64 } from "@/lib/fileUtils";
import axios from "axios";
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
  aadharNumber: z.string().optional().refine((val) => !val || /^\d{12}$/.test(val), {
    message: "farmer.errors.aadhar"
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
  ifscCode: z.string().optional()
});

type FarmerForm = z.infer<typeof farmerSchema>;

const FarmerRegistration = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Guard: if registration is already complete, skip back to daily entry
  useEffect(() => {
    if (localStorage.getItem('aqua-reg-complete') === '1') {
      navigate('/entries/daily', { replace: true });
    }
  }, []);

  const [step, setStep] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [aadharOcrLoading, setAadharOcrLoading] = useState(false);
  const [aadharOcrDone, setAadharOcrDone] = useState(false);
  const aadharInputRef = useRef<HTMLInputElement>(null);
  const steps = [t("farmer.stepBasic"), t("farmer.stepAddress"), t("farmer.stepIdentity")];
  const session = JSON.parse(localStorage.getItem('aqua-session') || '{}');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors }
  } = useForm<FarmerForm>({
    resolver: zodResolver(farmerSchema as any),
    defaultValues: (() => {
      const draftStr = localStorage.getItem("draft_farmer");
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          return { ...draft, phone: session.phone || draft.phone || '' };
        } catch(e) {}
      }
      return { phone: session.phone || '' };
    })()
  });

  const formValues = watch();

  useEffect(() => {
    // Autosave text fields to local storage
    const draft = { ...formValues };
    delete draft.regCertificate;
    delete draft.aadharFile;
    delete draft.panFile;
    delete draft.photo;
    localStorage.setItem("draft_farmer", JSON.stringify(draft));
  }, [formValues]);

  const { syncStatus } = useAutoSave(formValues, async () => {
    if (!session.farmerId) return;
    try {
      await axios.patch(`/api/farmers/${session.farmerId}`, {
        name: formValues.name,
        fatherName: formValues.fatherName,
        phone: formValues.phone,
        address: {
          village: formValues.village,
          taluk: formValues.taluk,
          district: formValues.district,
          state: formValues.state,
          pinCode: formValues.pinCode
        }
      });
      if (formValues.name) {
        localStorage.setItem('aqua-session', JSON.stringify({ ...session, name: formValues.name }));
        localStorage.setItem('shrimpguard-farmer', JSON.stringify({ name: formValues.name }));
      }
    } catch(e) {
      console.error("Cloud autosave failed", e);
      throw e;
    }
  });

  // gender removed from schema and step 0 validation
  const stepFields: Record<number, (keyof FarmerForm)[]> = {
    0: ["name", "fatherName", "phone"],
    1: ["village", "taluk", "district", "state", "pinCode"],
    2: []
  };

  const selectedState = watch("state");
  const selectedDistrict = watch("district");

  const districts = selectedState ? (LOCATIONS[selectedState] || []) : [];

  const nextStep = async () => {
    const fields = stepFields[step];
    if (fields.length > 0) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setStep((prev) => prev + 1);
  };

  // FIX: was "/insurance-registration" — skipped Farm Registration entirely
  const onSubmit = async (data: FarmerForm) => {
    try {
      toast.loading(t("common.saving"), { id: 'farmer-save' });

      // Get the farmerId stamped at login
      const session = JSON.parse(localStorage.getItem('aqua-session') || '{}');
      const farmerId = session.farmerId;
      if (!farmerId) {
        toast.dismiss('farmer-save');
        toast.error('Session expired. Please login again.');
        return;
      }

      // Convert files to Base64 strings to send as Mongoose Buffer/BinData
      const regCertificateBase64 = await fileToBase64(data.regCertificate);
      const aadharFileBase64 = await fileToBase64(data.aadharFile);
      const panFileBase64 = await fileToBase64(data.panFile);
      const photoBase64 = await fileToBase64(data.photo);

      const payload = {
        ...data,
        gender: data.gender,
        registration: {
          regType: data.regType,
          regNumber: data.regNumber,
          regCertificate: regCertificateBase64
        },
        identity: {
          aadharNumber: data.aadharNumber,
          aadharFile: aadharFileBase64,
          hasPan: data.hasPan === "yes",
          panNumber: data.panNumber,
          panFile: panFileBase64,
          photo: photoBase64
        },
        address: {
          village: data.village,
          taluk: data.taluk,
          district: data.district,
          state: data.state,
          pinCode: data.pinCode
        },
        bankDetails: {
          accountHolderName: data.accountHolderName,
          bankName: data.bankName,
          branch: data.branch,
          accountType: data.accountType,
          accountNumber: data.accountNumber,
          ifscCode: data.ifscCode
        }
      };

      // PATCH the skeleton doc created at login (not POST a new farmer)
      const res = await axios.patch(`/api/farmers/${farmerId}`, payload);

      if (res.data.success) {
        // Update session with the farmer's real name for dashboard display
        localStorage.setItem('aqua-session', JSON.stringify({ ...session, name: data.name }));
        localStorage.setItem('shrimpguard-farmer', JSON.stringify({ name: data.name }));
        localStorage.removeItem("draft_farmer"); // clear draft on success
        toast.dismiss('farmer-save');
        toast.success(t("farmer.saved"));
        navigate("/farm-registration");
      }
    } catch (error: any) {
      toast.dismiss('farmer-save');
      console.error('Submission error:', error);
      toast.error(error.response?.data?.error || t('common.error'));
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
    recognition.onresult = (e: any) => { setValue(field, e.results[0][0].transcript); };
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
      const res = await fetch("/api/farmers/ocr/aadhaar", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Please upload a valid Aadhaar card.");
        setValue("aadharFile", undefined);
        if (aadharInputRef.current) aadharInputRef.current.value = "";
        return;
      }
      const d = json.data;
      if (d.name) setValue("name", d.name);
      if (d.fatherName) setValue("fatherName", d.fatherName);
      if (d.gender) setValue("gender", d.gender);
      if (d.aadhaarNumber) setValue("aadharNumber", d.aadhaarNumber);
      setAadharOcrDone(true);
      toast.success("Aadhaar details extracted and autofilled!");
    } catch (err: any) {
      toast.error("OCR failed. Please fill details manually.");
    } finally {
      setAadharOcrLoading(false);
    }
  };

  const renderField = (name: keyof FarmerForm, placeholder: string, type = "text") => (
    <div className="relative">
      <Input
        {...register(name)}
        placeholder={placeholder}
        type={type}
        className="h-12 rounded-xl text-sm pr-11 placeholder:text-stone-300"
      />
      <button
        type="button"
        onClick={() => handleSpeak(name)}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-teal-500 hover:text-teal-700 transition-colors bg-transparent border-0 p-1"
      >
        <Mic size={16} />
      </button>
      {errors[name] && (
        <p className="text-red-500 text-xs mt-1 pl-0.5">
          {t(errors[name]?.message as string)}
        </p>
      )}
    </div>
  );

  const renderFileUploader = (label: string, accept: string, value: any, onChange: (file: File | undefined) => void, showCapture = false) => (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-stone-500 ml-0.5">{label}</p>
      <div className="flex gap-2">
        <label className="flex-1 flex items-center justify-between h-12 px-4 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors">
          <span className="text-sm text-stone-400 truncate max-w-[150px]">
            {value ? (value instanceof File ? value.name : t("common.upload")) : t("common.upload")}
          </span>
          <Upload size={16} className="text-teal-600 shrink-0 ml-2" />
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0])}
          />
        </label>
        
        {showCapture && (
          <button 
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className="flex items-center justify-center w-14 h-12 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors"
          >
            <span className="sr-only">{t("farmer.capturePhoto")}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          </button>
        )}
      </div>
    </div>
  );

  const renderCheckboxRow = (name: "isScSt", label: string) => (
    <label className="flex items-center gap-3 h-12 px-4 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors">
      <input
        type="checkbox"
        {...register(name)}
        className="w-4 h-4 accent-teal-600 cursor-pointer"
      />
      <span className="text-sm text-stone-600 font-medium">{label}</span>
    </label>
  );

  return (
    <div className="min-h-screen bg-stone-50 pb-24 text-stone-800 font-sans">
      <SyncIndicator status={syncStatus} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

      {isCameraOpen && (
        <CameraCapture 
          onCapture={(file) => setValue("photo", file, { shouldValidate: true })}
          onClose={() => setIsCameraOpen(false)}
          title={t("farmer.capturePhoto")}
        />
      )}

      {/* HEADER */}
      <div className="px-5 pt-8 pb-7 rounded-b-[2.5rem] relative overflow-hidden"
        style={{
          background: 'linear-gradient(140deg, #1c4a3e 0%, #1c6b5a 45%, #2d9b7f 100%)',
          boxShadow: '0 8px 32px -6px rgba(28,74,62,0.28)',
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 opacity-10"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="flex items-center justify-between relative z-10 mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-white tracking-tight">
              {t("farmer.title")}
            </h1>
          </div>
          <span className="text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15">
            Aqua <span className="text-amber-300">AI</span>nsure
          </span>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 relative z-10 px-1">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${i < step
                  ? "bg-amber-400 text-amber-900"
                  : i === step
                    ? "bg-white text-teal-700 shadow-lg"
                    : "bg-white/15 text-white/45 border border-white/15"
                  }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <p className={`text-[8px] uppercase font-bold tracking-widest whitespace-nowrap ${i <= step ? "text-white" : "text-white/35"
                  }`}>
                  {s.split(" ")[0]}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mb-5 transition-all ${i < step ? 'bg-amber-400/60' : 'bg-white/15'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mt-5 relative z-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <AnimatePresence mode="wait">

            {/* STEP 1 - Basic Details */}
            {step === 0 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl p-5 space-y-3 border border-stone-100 shadow-sm"
              >
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                  {t("farmer.stepBasic")}
                </h3>

                {/* ── AADHAAR QUICK SCAN (top of step 1) ── */}
                <div className="space-y-2 pb-1 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <ScanLine size={14} className="text-teal-600" />
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Aadhaar Card</p>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">Auto-fill</span>
                  </div>
                  <p className="text-[10px] text-stone-400 leading-snug">
                    Upload your Aadhaar card — name &amp; gender will be filled automatically
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
                      <span className={`text-sm font-medium truncate max-w-[180px] ${
                        aadharOcrDone ? "text-teal-700" : aadharOcrLoading ? "text-amber-600" : "text-stone-400"
                      }`}>
                        {aadharOcrLoading
                          ? "Reading Aadhaar…"
                          : aadharOcrDone
                          ? (watch("aadharFile") instanceof File ? (watch("aadharFile") as File).name : "Aadhaar scanned ✓")
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

                  {aadharOcrLoading && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                      <Loader2 size={12} className="text-amber-500 animate-spin shrink-0" />
                      <p className="text-[10px] text-amber-700 font-medium">Scanning Aadhaar with OCR…</p>
                    </div>
                  )}
                  {aadharOcrDone && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50 border border-teal-200">
                      <CheckCircle2 size={12} className="text-teal-500 shrink-0" />
                      <p className="text-[10px] text-teal-700 font-medium">Details auto-filled! Please verify and edit if needed.</p>
                    </div>
                  )}
                </div>

                {renderField("name", t("farmer.name"))}
                {renderField("fatherName", t("farmer.fatherName"))}
                {renderField("phone", t("farmer.phone"), "tel")}
                <Select onValueChange={(v) => setValue("gender", v)} value={watch("gender") || ""}>
                  <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm">
                    <SelectValue placeholder={t("farmer.gender", "Gender")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {renderCheckboxRow("isScSt", t("farmer.scst"))}
                <div className="space-y-1.5 pt-0.5">
                  <p className="text-xs font-semibold text-stone-500 ml-0.5">{t("farmer.dob")}</p>
                  <Input
                    type="date"
                    {...register("dob")}
                    className="h-12 rounded-xl text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25 focus-visible:border-teal-500"
                  />
                </div>
                {renderFileUploader(
                  t("farmer.photo"),
                  "image/*",
                  watch("photo"),
                  (file) => setValue("photo", file),
                  true
                )}
              </motion.div>
            )}

            {/* STEP 2 - Address Details */}
            {step === 1 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-2xl p-5 space-y-3 border border-stone-100 shadow-sm"
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                  {t("farmer.stepAddress")}
                </h3>
                {renderField("village", t("farmer.village"))}
                
                {/* State Dropdown */}
                <div className="space-y-1.5">
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
                      {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.state && <p className="text-red-500 text-[10px] mt-1 pl-1">{t(errors.state.message as string)}</p>}
                </div>

                {/* District Dropdown */}
                <div className="space-y-1.5">
                  <Select 
                    onValueChange={(v) => {
                      setValue("district", v, { shouldValidate: true });
                      setValue("taluk", "");
                    }} 
                    value={watch("district")}
                    disabled={!selectedState}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4 shadow-sm focus-visible:ring-teal-500/25">
                      <SelectValue placeholder={t("farmer.district")} />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.district && <p className="text-red-500 text-[10px] mt-1 pl-1">{t(errors.district.message as string)}</p>}
                </div>

                {/* Taluk (Typed) */}
                {renderField("taluk", t("farmer.taluk"))}

                {renderField("pinCode", t("farmer.pinCode"), "tel")}
              </motion.div>
            )}

            {/* STEP 3 - Identity & Bank */}
            {step === 2 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl p-5 space-y-3 border border-stone-100 shadow-sm"
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                  {t("farmer.stepIdentity")}
                </h3>
                <Select onValueChange={(v) => setValue("regType", v)} value={watch("regType")}>
                  <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4">
                    <SelectValue placeholder={t("farmer.registrationType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caa">CAA</SelectItem>
                    <SelectItem value="mpeda">MPEDA</SelectItem>
                    <SelectItem value="dof">DoF</SelectItem>
                  </SelectContent>
                </Select>
                {renderField("regNumber", t("farmer.regNumber"))}
                {renderFileUploader(
                  t("farmer.regCertificate"),
                  ".pdf",
                  watch("regCertificate"),
                  (file) => setValue("regCertificate", file)
                )}
                {renderField("aadharNumber", t("farmer.aadharNumber"), "tel")}
                <Select onValueChange={(v) => setValue("hasPan", v)} value={watch("hasPan")}>
                  <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4">
                    <SelectValue placeholder={t("farmer.hasPan")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">{t("common.yes")}</SelectItem>
                    <SelectItem value="no">{t("common.no")}</SelectItem>
                  </SelectContent>
                </Select>
                {watch("hasPan") === "yes" && (
                  <>
                    {renderField("panNumber", t("farmer.panNumber"))}
                    {renderFileUploader(
                      t("farmer.panFile"),
                      ".pdf,.jpg,.png",
                      watch("panFile"),
                      (file) => setValue("panFile", file)
                    )}
                  </>
                )}

                {/* FIX: was hardcoded "Bank Details" — now uses t("farmer.bankDetails") */}
                <div className="pt-2 border-t border-stone-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
                    {t("farmer.bankDetails")}
                  </p>
                  <div className="space-y-3">
                    {renderField("accountHolderName", t("farmer.accountHolderName"))}
                    {renderField("bankName", t("farmer.bankName"))}
                    {renderField("branch", t("farmer.branch"))}
                    <Select onValueChange={(v) => setValue("accountType", v)} value={watch("accountType")}>
                      <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4">
                        <SelectValue placeholder={t("farmer.accountType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">{t("farmer.savings")}</SelectItem>
                        <SelectItem value="current">{t("farmer.current")}</SelectItem>
                      </SelectContent>
                    </Select>
                    {renderField("accountNumber", t("farmer.accountNumber"))}
                    {renderField("ifscCode", t("farmer.ifscCode"))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1 h-12 rounded-xl border-stone-200 text-stone-600 font-semibold"
              >
                {t("common.back")}
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="flex-1 h-12 rounded-xl text-white font-bold"
                style={{
                  background: 'linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)',
                  boxShadow: '0 6px 24px -4px rgba(28,107,90,0.28)',
                }}
              >
                {t("common.next")}
              </Button>
            ) : (
              <Button
                type="submit"
                className="flex-1 h-12 rounded-xl text-white font-bold"
                style={{
                  background: 'linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)',
                  boxShadow: '0 6px 24px -4px rgba(28,107,90,0.28)',
                }}
              >
                {t("farmer.save")}
              </Button>
            )}
          </div>
        </form>
      </div>
      <BottomNav />
    </div>
  );
};

export default FarmerRegistration;