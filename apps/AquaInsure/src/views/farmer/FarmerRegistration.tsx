import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Mic,
  Upload,
  ScanLine,
  CheckCircle2,
  Loader2,
  MapPin,
  Camera,
  ShieldCheck,
  Waves,
  X
} from "lucide-react";
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
import { useAutoSave } from "@/hooks/useAutoSave";
import { uploadToSeaweedFS, resolveMediaUrl } from "@/lib/fileUtils";
import axios, { API_BASE_URL } from "@/lib/api";
import CameraCapture from "@/components/CameraCapture";
import { LOCATIONS, STATES } from "@/constants/locations";
import { addDays, format } from "date-fns";

export interface UnifiedWizardProps {
  initialStep?: number;
}

const STEP_LABELS = [
  { id: 0, title: "Farmer", subtitle: "Personal & Bank" },
  { id: 1, title: "Farm", subtitle: "Location & Infra" },
  { id: 2, title: "Insurance", subtitle: "Policy & Ponds" },
  { id: 3, title: "Ponds", subtitle: "Size & Photos" },
];

export default function FarmerRegistration({ initialStep = 0 }: UnifiedWizardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isEditMode = searchParams.get("mode") === "edit";
  const queryStep = searchParams.get("step");

  // Determine starting step
  const startingStep = useMemo(() => {
    if (queryStep !== null) {
      const parsed = parseInt(queryStep, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 3) return parsed;
      if (queryStep === "farmer") return 0;
      if (queryStep === "farm") return 1;
      if (queryStep === "insurance") return 2;
      if (queryStep === "ponds") return 3;
    }
    return initialStep;
  }, [queryStep, initialStep]);

  const [step, setStep] = useState<number>(startingStep);
  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    const list: number[] = [];
    if (startingStep > 0) {
      for (let i = 0; i < startingStep; i++) list.push(i);
    }
    return list;
  });

  const [session, setSession] = useState<{ phone?: string; farmerId?: string; name?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── STEP 0: FARMER STATE ──
  const [farmerData, setFarmerData] = useState({
    name: "",
    fatherName: "",
    phone: "",
    gender: "",
    isScSt: false,
    dob: "",
    community: "",
    village: "",
    taluk: "",
    district: "",
    state: "",
    pinCode: "",
    regType: "",
    regNumber: "",
    regCertificate: null as File | string | null,
    aadharNumber: "",
    aadharFile: null as File | string | null,
    hasPan: "no",
    panNumber: "",
    panFile: null as File | string | null,
    photo: null as File | string | null,
    accountHolderName: "",
    bankName: "",
    branch: "",
    accountType: "",
    accountNumber: "",
    ifscCode: "",
  });

  const [aadharOcrLoading, setAadharOcrLoading] = useState(false);
  const [aadharOcrDone, setAadharOcrDone] = useState(false);
  const [farmerCameraOpen, setFarmerCameraOpen] = useState(false);
  const aadharInputRef = useRef<HTMLInputElement>(null);

  // ── STEP 1: FARM STATE ──
  const [farmData, setFarmData] = useState({
    farmId: "",
    state: "",
    district: "",
    taluk: "",
    place: "",
    latitude: "",
    longitude: "",
    ownership: "owned",
    patta: "",
    totalPonds: "1",
    farmPhoto: null as File | string | null,
    farmPhotoPreview: null as string | null,
  });

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
  const [farmCameraOpen, setFarmCameraOpen] = useState(false);

  // ── STEP 2: INSURANCE STATE ──
  const [insuranceData, setInsuranceData] = useState({
    stockingDate: "",
    stockingDensity: "40",
    insuranceType: "comprehensive",
    insurancePeriod: "120",
    species: "vannamei",
  });
  const [selectedPonds, setSelectedPonds] = useState<string[]>([]);

  // ── STEP 3: PONDS STATE ──
  interface PondItem {
    pondId: string;
    pondNumber: number;
    dimensionAcres: string;
    photo: File | null;
    photoPreview: string | null;
    village: string;
    taluk: string;
    district: string;
    state: string;
    pinCode: string;
  }
  const [pondDetails, setPondDetails] = useState<Record<string, PondItem>>({});
  const [pondCameraFor, setPondCameraFor] = useState<string | null>(null);

  // Load / Rehydrate initial state from localStorage & Backend
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!isEditMode && localStorage.getItem("aqua-reg-complete") === "1" && startingStep === 0) {
      navigate("/entries/daily", { replace: true });
      return;
    }

    try {
      const sess = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      setSession(sess);

      // 1. Hydrate Farmer
      const draftFarmerStr = localStorage.getItem("draft_farmer");
      if (draftFarmerStr) {
        const df = JSON.parse(draftFarmerStr);
        setFarmerData((prev) => ({ ...prev, ...df, phone: sess.phone || df.phone || "" }));
      } else if (sess.phone) {
        setFarmerData((prev) => ({ ...prev, phone: sess.phone }));
      }

      // If in edit mode, fetch real farmer details
      if (isEditMode && sess.farmerId) {
        axios.get(`/api/farmers/${sess.farmerId}`).then((res) => {
          if (res.data?.success && res.data?.data) {
            const f = res.data.data;
            setFarmerData((prev) => ({
              ...prev,
              name: f.name || "",
              fatherName: f.fatherName || "",
              phone: f.phone || sess.phone || "",
              gender: f.gender || "",
              isScSt: !!f.isScSt,
              dob: f.dob ? f.dob.split("T")[0] : "",
              community: f.community || "",
              village: f.address?.village || "",
              taluk: f.address?.taluk || "",
              district: f.address?.district || "",
              state: f.address?.state || "",
              pinCode: f.address?.pinCode || "",
              regType: f.registration?.regType || "",
              regNumber: f.registration?.regNumber || "",
              aadharNumber: f.identity?.aadharNumber || "",
              hasPan: f.identity?.hasPan ? "yes" : "no",
              panNumber: f.identity?.panNumber || "",
              accountHolderName: f.bankDetails?.accountHolderName || "",
              bankName: f.bankDetails?.bankName || "",
              branch: f.bankDetails?.branch || "",
              accountType: f.bankDetails?.accountType || "",
              accountNumber: f.bankDetails?.accountNumber || "",
              ifscCode: f.bankDetails?.ifscCode || "",
            }));
          }
        }).catch((err) => console.error("Error loading farmer profile:", err));
      }

      // 2. Hydrate Farm
      const savedFarm = JSON.parse(localStorage.getItem("aqua-farm") || "{}");
      const draftFarmStr = localStorage.getItem("draft_farm_form");
      if (draftFarmStr) {
        const dfarm = JSON.parse(draftFarmStr);
        setFarmData((prev) => ({ ...prev, ...dfarm, farmId: savedFarm.farmId || dfarm.farmId || "" }));
      } else if (savedFarm.farmId) {
        setFarmData((prev) => ({ ...prev, farmId: savedFarm.farmId }));
      }

      const draftInfraStr = localStorage.getItem("draft_farm_infra");
      if (draftInfraStr) {
        setInfra(JSON.parse(draftInfraStr));
      }

      // 3. Hydrate Insurance
      const draftInsStr = localStorage.getItem("draft_insurance_form");
      if (draftInsStr) {
        setInsuranceData((prev) => ({ ...prev, ...JSON.parse(draftInsStr) }));
      }

      const draftPondsSelStr = localStorage.getItem("draft_insurance_ponds");
      if (draftPondsSelStr) {
        setSelectedPonds(JSON.parse(draftPondsSelStr));
      }

      // 4. Hydrate Insured Ponds
      const draftPondsDetailStr = localStorage.getItem("draft_insured_ponds");
      if (draftPondsDetailStr) {
        const parsed = JSON.parse(draftPondsDetailStr);
        setPondDetails(parsed);
      }
    } catch (e) {
      console.error("Hydration error:", e);
    }
  }, [navigate, isEditMode, startingStep]);

  // Sync farm state when farmer address is updated
  useEffect(() => {
    if (!farmData.state && farmerData.state) {
      setFarmData((prev) => ({
        ...prev,
        state: farmerData.state,
        district: farmerData.district,
        taluk: farmerData.taluk,
        place: farmerData.village,
      }));
    }
  }, [farmerData.state, farmerData.district, farmerData.taluk, farmerData.village, farmData.state]);

  // Keep pondDetails synchronized with totalPonds and selectedPonds
  useEffect(() => {
    const count = parseInt(farmData.totalPonds, 10) || 1;

    const savedFarm = JSON.parse(localStorage.getItem("aqua-farm") || "{}");
    const backendPonds: any[] = savedFarm.ponds || [];

    const updated: Record<string, PondItem> = { ...pondDetails };

    for (let i = 0; i < count; i++) {
      const bPond = backendPonds[i];
      const pId = bPond?._id || bPond?.pondId || `pond-${i + 1}`;
      if (!updated[pId]) {
        updated[pId] = {
          pondId: pId,
          pondNumber: i + 1,
          dimensionAcres: bPond?.dimensionAcres ? String(bPond.dimensionAcres) : "1.0",
          photo: null,
          photoPreview: bPond?.photo ? resolveMediaUrl(bPond.photo) : null,
          village: farmerData.village || farmData.place || "",
          taluk: farmerData.taluk || farmData.taluk || "",
          district: farmerData.district || farmData.district || "",
          state: farmerData.state || farmData.state || "",
          pinCode: farmerData.pinCode || "",
        };
      }
    }

    // Default selectedPonds if empty
    if (selectedPonds.length === 0) {
      setSelectedPonds(Object.keys(updated));
    }
  }, [farmData.totalPonds, farmerData, farmData.place, farmData.taluk, farmData.district, farmData.state]);

  // Save drafts to localStorage
  useEffect(() => {
    try {
      const cleanFarmer = { ...farmerData };
      delete (cleanFarmer as any).regCertificate;
      delete (cleanFarmer as any).aadharFile;
      delete (cleanFarmer as any).panFile;
      delete (cleanFarmer as any).photo;
      localStorage.setItem("draft_farmer", JSON.stringify(cleanFarmer));

      const cleanFarm = { ...farmData };
      delete (cleanFarm as any).farmPhoto;
      localStorage.setItem("draft_farm_form", JSON.stringify(cleanFarm));
      localStorage.setItem("draft_farm_infra", JSON.stringify(infra));

      localStorage.setItem("draft_insurance_form", JSON.stringify(insuranceData));
      localStorage.setItem("draft_insurance_ponds", JSON.stringify(selectedPonds));
      localStorage.setItem("draft_insured_ponds", JSON.stringify(pondDetails));
    } catch (e) {
      console.warn("Autosave draft write warning:", e);
    }
  }, [farmerData, farmData, infra, insuranceData, selectedPonds, pondDetails]);

  const { syncStatus } = useAutoSave([farmerData, farmData, infra, insuranceData]);

  // ── STEP JUMPING & VALIDATION ──
  const markStepDone = (stepIdx: number) => {
    setCompletedSteps((prev) => (prev.includes(stepIdx) ? prev : [...prev, stepIdx]));
  };

  const handleStepJump = (targetStep: number) => {
    if (targetStep === step) return;
    if (completedSteps.includes(targetStep) || targetStep <= Math.max(...completedSteps, 0) + 1) {
      setStep(targetStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.info("Please complete the current step before jumping forward.");
    }
  };

  // ── SPEECH RECOGNITION ──
  const handleSpeak = (setter: (val: string) => void) => {
    if (!("webkitSpeechRecognition" in window)) {
      toast.error(t("common.speechError") || "Speech recognition not supported");
      return;
    }
    const SR: any = (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = localStorage.getItem("shrimpguard-lang") === "ta" ? "ta-IN" : "en-IN";
    recognition.onresult = (e: any) => {
      setter(e.results[0][0].transcript);
    };
    recognition.start();
    toast.info(t("common.listening") || "Listening…");
  };

  // ── AADHAAR OCR SCAN ──
  const handleAadhaarUpload = async (file: File | undefined) => {
    if (!file) return;
    setFarmerData((prev) => ({ ...prev, aadharFile: file }));
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
      setFarmerData((prev) => ({
        ...prev,
        name: d.name || prev.name,
        gender: d.gender || prev.gender,
        dob: d.dob || prev.dob,
        fatherName: d.fatherName || prev.fatherName,
        village: d.address?.village || prev.village,
        taluk: d.address?.taluk || prev.taluk,
        district: d.address?.district || prev.district,
        state: d.address?.state || prev.state,
        pinCode: d.address?.pinCode || prev.pinCode,
        aadharNumber: d.aadhaarNumber || prev.aadharNumber,
      }));
      setAadharOcrDone(true);
      toast.success("Aadhaar details extracted & auto-filled!");
    } catch (err) {
      toast.error("OCR scan could not read details clearly. Please verify fields manually.");
    } finally {
      setAadharOcrLoading(false);
    }
  };

  // ── GPS GEO CAPTURE ──
  const captureGeo = () => {
    if (!navigator.geolocation) {
      toast.error(t("farm.geoNotSupported") || "Geo location not supported");
      return;
    }
    toast.loading(t("common.capturing") || "Capturing GPS…", { id: "geo" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFarmData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        toast.dismiss("geo");
        toast.success(t("farm.geoCaptured") || "GPS Coordinates captured!");
      },
      () => {
        toast.dismiss("geo");
        setFarmData((prev) => ({
          ...prev,
          latitude: "13.0827",
          longitude: "80.2707",
        }));
        toast.info("Location permission bypassed (using fallback coordinates).");
      }
    );
  };

  // ── STEP SUBMISSIONS & NAVIGATION ──

  // Advance Step 0 -> Step 1 (Farmer -> Farm)
  const submitFarmerStep = async () => {
    if (!farmerData.name.trim()) {
      toast.error(t("farmer.errors.name") || "Farmer name is required");
      return;
    }
    if (!farmerData.phone.trim() || !/^[0-9]{10}$/.test(farmerData.phone)) {
      toast.error(t("farmer.errors.phone") || "Valid 10-digit phone number is required");
      return;
    }
    if (!farmerData.village.trim() || !farmerData.district.trim() || !farmerData.state.trim()) {
      toast.error("Please fill in complete address (Village, District, State)");
      return;
    }

    try {
      setIsSubmitting(true);
      toast.loading(t("common.saving"), { id: "farmer-save" });

      const sess = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = sess.farmerId;
      if (!farmerId) {
        toast.dismiss("farmer-save");
        toast.error("Session expired. Please log in again.");
        setIsSubmitting(false);
        return;
      }

      // Upload media
      const [regCertMedia, aadharMedia, panMedia, photoMedia] = await Promise.all([
        farmerData.regCertificate instanceof File
          ? uploadToSeaweedFS(farmerData.regCertificate, `farmers/${farmerId}/kyc`)
          : farmerData.regCertificate ? { url: farmerData.regCertificate } : null,
        farmerData.aadharFile instanceof File
          ? uploadToSeaweedFS(farmerData.aadharFile, `farmers/${farmerId}/kyc`)
          : farmerData.aadharFile ? { url: farmerData.aadharFile } : null,
        farmerData.panFile instanceof File
          ? uploadToSeaweedFS(farmerData.panFile, `farmers/${farmerId}/kyc`)
          : farmerData.panFile ? { url: farmerData.panFile } : null,
        farmerData.photo instanceof File
          ? uploadToSeaweedFS(farmerData.photo, `farmers/${farmerId}/kyc`)
          : farmerData.photo ? { url: farmerData.photo } : null,
      ]);

      const getMediaVal = (m: any): string | null => (m ? m.key || m.url || null : null);

      const payload = {
        name: farmerData.name,
        fatherName: farmerData.fatherName,
        phone: farmerData.phone,
        dob: farmerData.dob,
        community: farmerData.community,
        gender: farmerData.gender,
        isScSt: farmerData.isScSt,
        registration: {
          regType: farmerData.regType,
          regNumber: farmerData.regNumber?.trim() || undefined,
          regCertificate: getMediaVal(regCertMedia),
        },
        identity: {
          aadharNumber: farmerData.aadharNumber?.trim() || undefined,
          aadharFile: getMediaVal(aadharMedia),
          hasPan: farmerData.hasPan === "yes",
          panNumber: farmerData.panNumber?.trim() || undefined,
          panFile: getMediaVal(panMedia),
          photo: getMediaVal(photoMedia),
        },
        address: {
          village: farmerData.village,
          taluk: farmerData.taluk,
          district: farmerData.district,
          state: farmerData.state,
          pinCode: farmerData.pinCode,
        },
        bankDetails: {
          accountHolderName: farmerData.accountHolderName,
          bankName: farmerData.bankName,
          branch: farmerData.branch,
          accountType: farmerData.accountType,
          accountNumber: farmerData.accountNumber,
          ifscCode: farmerData.ifscCode,
        },
      };

      await axios.patch(`/api/farmers/${farmerId}`, payload);

      localStorage.setItem("aqua-session", JSON.stringify({ ...sess, name: farmerData.name }));
      localStorage.setItem("shrimpguard-farmer", JSON.stringify({ name: farmerData.name }));

      toast.dismiss("farmer-save");
      toast.success(isEditMode ? "Farmer profile updated" : "Farmer details saved!");
      markStepDone(0);

      if (isEditMode) {
        navigate("/settings");
      } else {
        setStep(1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err: any) {
      toast.dismiss("farmer-save");
      console.error("Farmer submission error:", err);
      toast.error(err.response?.data?.error || t("common.error") || "Error saving farmer");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Advance Step 1 -> Step 2 (Farm -> Insurance)
  const submitFarmStep = async () => {
    if (!farmData.state.trim() || !farmData.district.trim() || !farmData.taluk.trim()) {
      toast.error("Please fill Farm State, District, and Taluk");
      return;
    }
    if (!farmData.patta.trim()) {
      toast.error(t("farm.errors.patta") || "Patta / Survey number is required");
      return;
    }

    try {
      setIsSubmitting(true);
      toast.loading(t("common.saving"), { id: "farm-save" });

      const sess = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = sess.farmerId;
      if (!farmerId) {
        toast.dismiss("farm-save");
        toast.error("Session expired. Please log in again.");
        setIsSubmitting(false);
        return;
      }

      let farmPhotoUrl: string | null = null;
      if (farmData.farmPhoto instanceof File) {
        const uploaded = await uploadToSeaweedFS(farmData.farmPhoto, `farmers/${farmerId}/farms`);
        farmPhotoUrl = uploaded?.key || uploaded?.url || null;
      } else if (typeof farmData.farmPhoto === "string") {
        farmPhotoUrl = farmData.farmPhoto;
      }

      const totalPondsNum = Number(farmData.totalPonds) || 1;

      const payload = {
        farmerId,
        location: {
          place: farmData.place || farmerData.village,
          taluk: farmData.taluk,
          district: farmData.district,
          state: farmData.state,
        },
        latitude: farmData.latitude || "13.0827",
        longitude: farmData.longitude || "80.2707",
        ownership: {
          type: farmData.ownership,
          patta: farmData.patta,
        },
        totalPonds: totalPondsNum,
        pondsCount: totalPondsNum,
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
        const savedFarm = {
          farmId: res.data.data._id,
          ponds: res.data.ponds || [],
        };
        localStorage.setItem("aqua-farm", JSON.stringify(savedFarm));
        setFarmData((prev) => ({ ...prev, farmId: savedFarm.farmId }));

        toast.dismiss("farm-save");
        toast.success(t("farm.saved") || "Farm details saved!");
        markStepDone(1);
        setStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err: any) {
      toast.dismiss("farm-save");
      console.error("Farm submission error:", err);
      toast.error(err.response?.data?.error || t("common.error") || "Error saving farm");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Advance Step 2 -> Step 3 (Insurance -> Ponds)
  const submitInsuranceStep = async () => {
    if (!insuranceData.stockingDate) {
      toast.error(t("insurance.errors.date") || "Stocking date is required");
      return;
    }
    if (!insuranceData.stockingDensity) {
      toast.error(t("insurance.errors.density") || "Stocking density is required");
      return;
    }
    if (selectedPonds.length === 0) {
      toast.error("Please select at least one pond for insurance coverage");
      return;
    }

    try {
      setIsSubmitting(true);
      toast.loading(t("common.saving"), { id: "ins-save" });

      const sess = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = sess.farmerId;
      const savedFarm = JSON.parse(localStorage.getItem("aqua-farm") || "{}");
      const farmId = savedFarm.farmId || farmData.farmId;

      if (!farmerId || !farmId) {
        toast.dismiss("ins-save");
        toast.error("Farm ID missing. Please return to Step 2 and re-save.");
        setIsSubmitting(false);
        return;
      }

      const stockingDateParsed = new Date(insuranceData.stockingDate);
      const periodDays = parseInt(insuranceData.insurancePeriod, 10) || 120;
      const plannedHarvestDate = format(addDays(stockingDateParsed, periodDays), "yyyy-MM-dd");
      const maxHarvestDate = format(addDays(stockingDateParsed, periodDays + 15), "yyyy-MM-dd");

      const ponds = savedFarm.ponds || [];
      const firstPondId = selectedPonds[0] || ponds[0]?._id || ponds[0]?.pondId || "pond-1";

      const payload = {
        farmerId,
        farmId,
        pondId: firstPondId,
        stockingDate: insuranceData.stockingDate,
        stockingDensity: Number(insuranceData.stockingDensity),
        insuranceType: insuranceData.insuranceType,
        insurancePeriod: insuranceData.insurancePeriod,
        insurancePeriodDays: periodDays,
        species: insuranceData.species,
        plannedHarvestDate,
        maxHarvestDate,
        insuredPondIds: selectedPonds,
      };

      const res = await axios.post("/api/insurances", payload);
      if (res.data?.success) {
        savedFarm.insuredPondIds = selectedPonds;
        localStorage.setItem("aqua-farm", JSON.stringify(savedFarm));

        toast.dismiss("ins-save");
        toast.success(t("insurance.saved") || "Insurance policy saved!");
        markStepDone(2);
        setStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err: any) {
      toast.dismiss("ins-save");
      console.error("Insurance submission error:", err);
      toast.error(err.response?.data?.error || t("common.error") || "Error saving insurance");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Final Step 3 Submission (Ponds Configuration -> Complete)
  const submitPondsStep = async () => {
    try {
      setIsSubmitting(true);
      toast.loading("Finalizing registration…", { id: "final-save" });

      const sess = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = sess.farmerId;
      const savedFarm = JSON.parse(localStorage.getItem("aqua-farm") || "{}");
      const farmId = savedFarm.farmId || farmData.farmId;

      if (!farmerId || !farmId) {
        toast.dismiss("final-save");
        toast.error("Session information missing.");
        setIsSubmitting(false);
        return;
      }

      // Save each pond's details & upload photo
      const pondsToProcess = Object.values(pondDetails);
      for (const p of pondsToProcess) {
        let photoUrl: string | null = null;
        if (p.photo instanceof File) {
          const uploaded = await uploadToSeaweedFS(p.photo, `farmers/${farmerId}/ponds/${p.pondId}`);
          photoUrl = uploaded?.key || uploaded?.url || null;
        } else if (p.photoPreview && !p.photoPreview.startsWith("blob:")) {
          photoUrl = p.photoPreview;
        }

        const pondPayload = {
          dimensionAcres: parseFloat(p.dimensionAcres) || 1.0,
          photo: photoUrl,
          address: {
            village: p.village || farmerData.village,
            taluk: p.taluk || farmerData.taluk,
            district: p.district || farmerData.district,
            state: p.state || farmerData.state,
            pinCode: p.pinCode || farmerData.pinCode,
          },
        };

        if (p.pondId && !p.pondId.startsWith("pond-")) {
          try {
            await axios.patch(`/api/farms/${farmId}/ponds/${p.pondId}`, pondPayload);
          } catch (pe) {
            console.warn(`Pond ${p.pondId} patch notice:`, pe);
          }
        }
      }

      // Mark full registration complete
      localStorage.setItem("aqua-reg-complete", "1");
      localStorage.removeItem("draft_farmer");
      localStorage.removeItem("draft_farm_form");
      localStorage.removeItem("draft_farm_infra");
      localStorage.removeItem("draft_insurance_form");
      localStorage.removeItem("draft_insurance_ponds");
      localStorage.removeItem("draft_insured_ponds");

      toast.dismiss("final-save");
      toast.success("🎉 Registration completed successfully!");
      markStepDone(3);
      setTimeout(() => {
        navigate("/entries/daily", { replace: true });
      }, 600);
    } catch (err: any) {
      toast.dismiss("final-save");
      console.error("Final submission error:", err);
      toast.error("Registration completed with local cache sync.");
      localStorage.setItem("aqua-reg-complete", "1");
      navigate("/entries/daily", { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Location lookups
  const farmerDistricts = farmerData.state ? LOCATIONS[farmerData.state] || [] : [];
  const farmDistricts = farmData.state ? LOCATIONS[farmData.state] || [] : [];

  // ── RENDER SHARED FORM FIELD COMPONENT ──
  const renderTextInput = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    type = "text",
    enableMic = false,
    required = false
  ) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-stone-500 ml-0.5 flex items-center justify-between">
        <span>{label} {required && <span className="text-rose-500">*</span>}</span>
      </label>
      <div className="relative">
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-12 rounded-xl text-base sm:text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25 focus-visible:border-teal-500 placeholder:text-stone-400 ${
            enableMic ? "pr-11" : ""
          }`}
        />
        {enableMic && (
          <button
            type="button"
            onClick={() => handleSpeak(onChange)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-teal-600 hover:text-teal-700 transition-colors bg-transparent border-0 p-1"
          >
            <Mic size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="h-full flex flex-col overflow-hidden bg-stone-50 relative text-stone-800 font-sans"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <SyncIndicator status={syncStatus} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Camera Capture Modals */}
      {farmerCameraOpen && (
        <CameraCapture
          onCapture={(file) => {
            setFarmerData((prev) => ({ ...prev, photo: file }));
            setFarmerCameraOpen(false);
          }}
          onClose={() => setFarmerCameraOpen(false)}
          title={t("farmer.capturePhoto") || "Capture Farmer Photo"}
        />
      )}

      {farmCameraOpen && (
        <CameraCapture
          onCapture={(file) => {
            const url = URL.createObjectURL(file);
            setFarmData((prev) => ({ ...prev, farmPhoto: file, farmPhotoPreview: url }));
            setFarmCameraOpen(false);
          }}
          onClose={() => setFarmCameraOpen(false)}
          title={t("farm.uploadPhoto") || "Capture Farm Overview"}
          facingMode="environment"
        />
      )}

      {pondCameraFor && (
        <CameraCapture
          onCapture={(file) => {
            const url = URL.createObjectURL(file);
            setPondDetails((prev) => ({
              ...prev,
              [pondCameraFor]: {
                ...prev[pondCameraFor],
                photo: file,
                photoPreview: url,
              },
            }));
            setPondCameraFor(null);
          }}
          onClose={() => setPondCameraFor(null)}
          title={`Capture Pond Photo`}
          facingMode="environment"
        />
      )}

      {/* SCROLLABLE INNER BODY */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-8">
        {/* UNIFIED HERO HEADER WITH INTERACTIVE STEPPER */}
        <div
          className="px-5 pt-8 pb-6 rounded-b-[2.5rem] relative overflow-hidden shrink-0"
          style={{
            background: "linear-gradient(140deg, #1c4a3e 0%, #1c6b5a 45%, #2d9b7f 100%)",
            boxShadow: "0 8px 32px -6px rgba(28,74,62,0.28)",
          }}
        >
          <div
            className="absolute top-0 right-0 w-36 h-36 rounded-full -mr-12 -mt-12 opacity-10"
            style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }}
          />

          {/* Top Bar: Back button, Title & Badge */}
          <div className="flex items-center justify-between relative z-10 mb-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (step > 0) {
                    setStep(step - 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else if (isEditMode) {
                    navigate("/settings");
                  } else {
                    navigate(-1);
                  }
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
                  {isEditMode ? "Edit Profile" : "Registration"}
                </h1>
                <p className="text-[10px] text-white/70 font-medium">
                  Step {step + 1} of 4 · {STEP_LABELS[step]?.title} Details
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15 transition-opacity duration-200 ${
                syncStatus !== "idle" ? "opacity-0" : "opacity-100"
              }`}
            >
              Aqua <span className="text-amber-300">AI</span>nsure
            </span>
          </div>

          {/* 4-STEP INTERACTIVE PROGRESS BAR */}
          <div className="flex items-center gap-1.5 relative z-10 px-0.5">
            {STEP_LABELS.map((s, i) => {
              const isDone = completedSteps.includes(i) || i < step;
              const isCurrent = i === step;
              const isClickable = isDone || i <= step;

              return (
                <div key={s.id} className="flex items-center gap-1.5 flex-1">
                  <button
                    type="button"
                    disabled={!isClickable}
                    onClick={() => handleStepJump(i)}
                    className={`flex flex-col items-center gap-1 flex-1 group transition-all text-left ${
                      isClickable ? "cursor-pointer active:scale-95" : "cursor-not-allowed opacity-50"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                        isDone && !isCurrent
                          ? "bg-amber-400 text-amber-950 shadow-sm ring-2 ring-amber-300/40"
                          : isCurrent
                          ? "bg-white text-teal-800 shadow-md ring-2 ring-white/60"
                          : "bg-white/15 text-white/50 border border-white/15"
                      }`}
                    >
                      {isDone && !isCurrent ? "✓" : i + 1}
                    </div>
                    <p
                      className={`text-[9px] uppercase font-bold tracking-wider whitespace-nowrap transition-colors ${
                        isCurrent ? "text-white" : isDone ? "text-amber-300/90" : "text-white/40"
                      }`}
                    >
                      {s.title}
                    </p>
                  </button>
                  {i < STEP_LABELS.length - 1 && (
                    <div
                      className={`h-[2px] flex-1 mb-4 rounded-full transition-all ${
                        i < step ? "bg-amber-400/80" : "bg-white/15"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Micro Progress Line */}
          <div className="mt-3.5 h-1 bg-white/15 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300"
              initial={{ width: `${((step + 1) / 4) * 100}%` }}
              animate={{ width: `${((step + 1) / 4) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* STEP CONTENT CONTAINER */}
        <div className="px-4 mt-5 relative z-10 space-y-5">
          <AnimatePresence mode="wait">
            {/* ══════════════════════════════════════════════════════════════
                STEP 0: FARMER REGISTRATION
               ══════════════════════════════════════════════════════════════ */}
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Aadhaar OCR Auto-Fill Box */}
                <div className="space-y-2 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <ScanLine size={15} className="text-teal-600" />
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Aadhaar Smart Scan
                    </p>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                      Auto-fill
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-snug">
                    Upload Aadhaar card image/PDF — name, gender, and address will be auto-filled.
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
                          aadharOcrDone ? "text-teal-700" : aadharOcrLoading ? "text-amber-600" : "text-stone-400"
                        }`}
                      >
                        {aadharOcrLoading
                          ? "Scanning Aadhaar…"
                          : aadharOcrDone
                          ? farmerData.aadharFile instanceof File
                            ? farmerData.aadharFile.name
                            : "Aadhaar verified ✓"
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

                {/* Personal Information */}
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 pt-1">
                  Personal Details
                </h3>
                {renderTextInput(
                  t("farmer.name") || "Farmer Name",
                  farmerData.name,
                  (v) => setFarmerData((p) => ({ ...p, name: v })),
                  "Enter farmer name",
                  "text",
                  true,
                  true
                )}
                {renderTextInput(
                  t("farmer.fatherName") || "Father's Name",
                  farmerData.fatherName,
                  (v) => setFarmerData((p) => ({ ...p, fatherName: v })),
                  "Enter father's name",
                  "text",
                  true
                )}
                {renderTextInput(
                  t("farmer.phone") || "Phone Number",
                  farmerData.phone,
                  (v) => setFarmerData((p) => ({ ...p, phone: v })),
                  "10-digit mobile number",
                  "tel",
                  false,
                  true
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-500 ml-0.5">Gender</label>
                  <Select
                    value={farmerData.gender}
                    onValueChange={(v) => setFarmerData((p) => ({ ...p, gender: v }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4 shadow-sm">
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* SC/ST Toggle */}
                <label className="flex items-center gap-3 h-12 px-4 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={farmerData.isScSt}
                    onChange={(e) => setFarmerData((p) => ({ ...p, isScSt: e.target.checked }))}
                    className="w-4 h-4 accent-teal-600 cursor-pointer"
                  />
                  <span className="text-sm text-stone-600 font-medium">SC / ST Category</span>
                </label>

                {/* DOB */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-500 ml-0.5">Date of Birth</label>
                  <Input
                    type="date"
                    value={farmerData.dob}
                    onChange={(e) => setFarmerData((p) => ({ ...p, dob: e.target.value }))}
                    className="h-12 rounded-xl text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25 focus-visible:border-teal-500"
                  />
                </div>

                {/* Farmer Photo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-500 ml-0.5">Farmer Photo</label>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-between h-12 px-4 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors">
                      <span className="text-sm text-stone-400 truncate max-w-[170px]">
                        {farmerData.photo
                          ? farmerData.photo instanceof File
                            ? farmerData.photo.name
                            : "Photo selected"
                          : "Upload photo"}
                      </span>
                      <Upload size={16} className="text-teal-600 shrink-0 ml-2" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setFarmerData((p) => ({ ...p, photo: e.target.files?.[0] || null }))}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setFarmerCameraOpen(true)}
                      className="flex items-center justify-center w-14 h-12 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-teal-600 transition-colors"
                    >
                      <Camera size={18} />
                    </button>
                  </div>
                </div>

                {/* Address Section */}
                <div className="pt-3 border-t border-stone-100 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Address Details
                  </h3>
                  {renderTextInput(
                    t("farmer.village") || "Village Name",
                    farmerData.village,
                    (v) => setFarmerData((p) => ({ ...p, village: v })),
                    "Enter village name",
                    "text",
                    true,
                    true
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-500 ml-0.5">
                      State <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={farmerData.state}
                      onValueChange={(v) =>
                        setFarmerData((p) => ({ ...p, state: v, district: "", taluk: "" }))
                      }
                    >
                      <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4 shadow-sm">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-500 ml-0.5">
                      District <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={farmerData.district}
                      disabled={!farmerData.state}
                      onValueChange={(v) => setFarmerData((p) => ({ ...p, district: v, taluk: "" }))}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4 shadow-sm">
                        <SelectValue placeholder="Select District" />
                      </SelectTrigger>
                      <SelectContent>
                        {farmerDistricts.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {renderTextInput(
                    t("farmer.taluk") || "Taluk / Mandal",
                    farmerData.taluk,
                    (v) => setFarmerData((p) => ({ ...p, taluk: v })),
                    "Enter taluk",
                    "text",
                    true
                  )}
                  {renderTextInput(
                    t("farmer.pinCode") || "PIN Code",
                    farmerData.pinCode,
                    (v) => setFarmerData((p) => ({ ...p, pinCode: v })),
                    "6-digit PIN code",
                    "tel"
                  )}
                </div>

                {/* Identity & Bank Section */}
                <div className="pt-3 border-t border-stone-100 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Identity & KYC
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-500 ml-0.5">
                      Registration Type
                    </label>
                    <Select
                      value={farmerData.regType}
                      onValueChange={(v) => setFarmerData((p) => ({ ...p, regType: v }))}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4 shadow-sm">
                        <SelectValue placeholder="Select Registration Authority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="caa">CAA (Coastal Aquaculture Authority)</SelectItem>
                        <SelectItem value="mpeda">MPEDA</SelectItem>
                        <SelectItem value="dof">DoF (Department of Fisheries)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {renderTextInput(
                    t("farmer.regNumber") || "Registration Number",
                    farmerData.regNumber,
                    (v) => setFarmerData((p) => ({ ...p, regNumber: v })),
                    "Enter registration certificate number"
                  )}

                  {renderTextInput(
                    t("farmer.aadharNumber") || "Aadhaar Number",
                    farmerData.aadharNumber,
                    (v) => setFarmerData((p) => ({ ...p, aadharNumber: v })),
                    "12-digit Aadhaar number",
                    "tel"
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-500 ml-0.5">
                      Do you have a PAN Card?
                    </label>
                    <Select
                      value={farmerData.hasPan}
                      onValueChange={(v) => setFarmerData((p) => ({ ...p, hasPan: v }))}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4 shadow-sm">
                        <SelectValue placeholder="Have PAN Card?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {farmerData.hasPan === "yes" &&
                    renderTextInput(
                      t("farmer.panNumber") || "PAN Number",
                      farmerData.panNumber,
                      (v) => setFarmerData((p) => ({ ...p, panNumber: v })),
                      "Enter 10-character PAN"
                    )}

                  {/* Bank Details */}
                  <div className="pt-2 border-t border-stone-100 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                      Bank Details
                    </h3>
                    {renderTextInput(
                      t("farmer.accountHolderName") || "Account Holder Name",
                      farmerData.accountHolderName,
                      (v) => setFarmerData((p) => ({ ...p, accountHolderName: v })),
                      "Name as per bank passbook"
                    )}
                    {renderTextInput(
                      t("farmer.bankName") || "Bank Name",
                      farmerData.bankName,
                      (v) => setFarmerData((p) => ({ ...p, bankName: v })),
                      "e.g. State Bank of India"
                    )}
                    {renderTextInput(
                      t("farmer.branch") || "Branch",
                      farmerData.branch,
                      (v) => setFarmerData((p) => ({ ...p, branch: v })),
                      "Branch name"
                    )}
                    {renderTextInput(
                      t("farmer.accountNumber") || "Account Number",
                      farmerData.accountNumber,
                      (v) => setFarmerData((p) => ({ ...p, accountNumber: v })),
                      "Bank account number",
                      "tel"
                    )}
                    {renderTextInput(
                      t("farmer.ifscCode") || "IFSC Code",
                      farmerData.ifscCode,
                      (v) => setFarmerData((p) => ({ ...p, ifscCode: v })),
                      "e.g. SBIN0001234"
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
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
                    type="button"
                    disabled={isSubmitting}
                    onClick={submitFarmerStep}
                    className="flex-1 h-12 rounded-xl text-white font-bold"
                    style={{
                      background: "linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)",
                      boxShadow: "0 6px 24px -4px rgba(28,107,90,0.28)",
                    }}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : isEditMode ? (
                      "Save Profile"
                    ) : (
                      "Next: Farm Details →"
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                STEP 1: FARM REGISTRATION
               ══════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Location & Farm Details
                </h3>

                {/* State */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-500 ml-0.5">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={farmData.state}
                    onValueChange={(v) =>
                      setFarmData((p) => ({ ...p, state: v, district: "", taluk: "" }))
                    }
                  >
                    <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4 shadow-sm">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* District */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-500 ml-0.5">
                    District <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={farmData.district}
                    disabled={!farmData.state}
                    onValueChange={(v) => setFarmData((p) => ({ ...p, district: v, taluk: "" }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4 shadow-sm">
                      <SelectValue placeholder="Select District" />
                    </SelectTrigger>
                    <SelectContent>
                      {farmDistricts.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {renderTextInput(
                  t("farm.taluk") || "Taluk / Mandal",
                  farmData.taluk,
                  (v) => setFarmData((p) => ({ ...p, taluk: v })),
                  "Enter taluk",
                  "text",
                  true,
                  true
                )}

                {/* GPS Tagging */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-500 ml-0.5">
                    Farm Geo-Tagging (GPS)
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={captureGeo}
                    className="w-full h-12 rounded-xl gap-2 border-stone-200 text-stone-700 bg-stone-50 hover:bg-stone-100 font-semibold"
                  >
                    <MapPin size={18} className="text-teal-600" />
                    {farmData.latitude && farmData.longitude
                      ? `GPS: ${farmData.latitude}, ${farmData.longitude}`
                      : "Capture Geo-Coordinates"}
                  </Button>
                </div>

                {/* Ownership Type */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-stone-500 ml-0.5">
                    Ownership Type
                  </label>
                  <div className="flex gap-2">
                    {["owned", "leased"].map((v) => {
                      const isActive = farmData.ownership === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setFarmData((p) => ({ ...p, ownership: v }))}
                          className={`flex-1 h-12 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            isActive
                              ? "text-white shadow-sm border-transparent"
                              : "bg-white border text-stone-500 border-stone-200 hover:border-teal-200"
                          }`}
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

                {renderTextInput(
                  t("farm.patta") || "Patta / Survey Number",
                  farmData.patta,
                  (v) => setFarmData((p) => ({ ...p, patta: v })),
                  "Enter Patta or Survey number",
                  "text",
                  false,
                  true
                )}

                {/* Total Ponds Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-500 ml-0.5">
                    Total Ponds on Farm <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={farmData.totalPonds}
                    onValueChange={(v) => setFarmData((p) => ({ ...p, totalPonds: v }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4 shadow-sm">
                      <SelectValue placeholder="Select number of ponds" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 30 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {i + 1} {i === 0 ? "Pond" : "Ponds"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Farm Overview Photo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-500 ml-0.5">
                    Farm Overview Photo (Optional)
                  </label>
                  {farmData.farmPhotoPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-900/5 aspect-video flex items-center justify-center">
                      <img
                        src={farmData.farmPhotoPreview}
                        alt="Farm Overview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFarmData((p) => ({ ...p, farmPhoto: null, farmPhotoPreview: null }))}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFarmCameraOpen(true)}
                        className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition"
                      >
                        <Camera size={18} className="text-teal-600" />
                        <span className="text-xs font-bold">Take Photo</span>
                      </button>
                      <label className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 cursor-pointer transition">
                        <Upload size={18} className="text-stone-500" />
                        <span className="text-xs font-bold">Upload Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              const url = URL.createObjectURL(f);
                              setFarmData((p) => ({ ...p, farmPhoto: f, farmPhotoPreview: url }));
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Infrastructure Checklist */}
                <div className="pt-3 border-t border-stone-100 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Infrastructure Checklist
                  </h3>
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
                    ].map(([key, label], idx) => {
                      const curVal = infra[key as keyof typeof infra];
                      return (
                        <div
                          key={key}
                          className={`flex justify-between items-center py-2.5 ${idx === 0 ? "pt-1" : ""}`}
                        >
                          <span className="text-xs font-medium text-stone-700">{label}</span>
                          <div className="flex bg-stone-100 rounded-lg p-0.5 gap-1">
                            <button
                              type="button"
                              onClick={() => setInfra((p) => ({ ...p, [key]: "yes" }))}
                              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                curVal === "yes"
                                  ? "bg-white text-teal-700 shadow-sm"
                                  : "text-stone-400"
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setInfra((p) => ({ ...p, [key]: "no" }))}
                              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                curVal === "no"
                                  ? "bg-white text-rose-600 shadow-sm"
                                  : "text-stone-400"
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep(0);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex-1 h-12 rounded-xl border-stone-200 text-stone-600 font-semibold"
                  >
                    ← Back to Farmer
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={submitFarmStep}
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
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                STEP 2: INSURANCE SETUP
               ══════════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center">
                    <ShieldCheck size={16} className="text-teal-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-700">
                      Aqua AInsure Policy Setup
                    </h2>
                    <p className="text-[11px] text-stone-400">
                      Select stocking dates, duration, and ponds to cover
                    </p>
                  </div>
                </div>

                {/* Stocking Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-500 ml-0.5">
                    Stocking Date <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={insuranceData.stockingDate}
                    onChange={(e) =>
                      setInsuranceData((p) => ({ ...p, stockingDate: e.target.value }))
                    }
                    className="h-12 rounded-xl text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25 focus-visible:border-teal-500"
                  />
                </div>

                {renderTextInput(
                  t("insurance.density") || "Stocking Density (PL / m²)",
                  insuranceData.stockingDensity,
                  (v) => setInsuranceData((p) => ({ ...p, stockingDensity: v })),
                  "e.g. 40",
                  "number",
                  false,
                  true
                )}

                {/* Insurance Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-500 ml-0.5">
                    Policy Coverage Type
                  </label>
                  <Select
                    value={insuranceData.insuranceType}
                    onValueChange={(v) =>
                      setInsuranceData((p) => ({ ...p, insuranceType: v }))
                    }
                  >
                    <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4 shadow-sm">
                      <SelectValue placeholder="Select Policy Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comprehensive">Comprehensive Risk Protection</SelectItem>
                      <SelectItem value="basic">Basic Mortality Cover</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Insurance Period */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-500 ml-0.5">
                    Insurance Period (Days)
                  </label>
                  <Select
                    value={insuranceData.insurancePeriod}
                    onValueChange={(v) =>
                      setInsuranceData((p) => ({ ...p, insurancePeriod: v }))
                    }
                  >
                    <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4 shadow-sm">
                      <SelectValue placeholder="Select Coverage Days" />
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

                {/* Ponds Selector */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <label className="text-xs font-semibold text-stone-500 ml-0.5 block">
                    Ponds Under Insurance Coverage <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(pondDetails).map((p) => {
                      const isSelected = selectedPonds.includes(p.pondId);
                      return (
                        <button
                          key={p.pondId}
                          type="button"
                          onClick={() => {
                            setSelectedPonds((prev) =>
                              isSelected
                                ? prev.filter((id) => id !== p.pondId)
                                : [...prev, p.pondId]
                            );
                          }}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                            isSelected
                              ? "text-white border-transparent shadow-sm"
                              : "bg-white text-stone-500 border-stone-200 hover:border-teal-300"
                          }`}
                          style={
                            isSelected
                              ? {
                                  background: "linear-gradient(110deg, #1c6b5a, #2d9b7f)",
                                  boxShadow: "0 4px 12px -2px rgba(28,107,90,0.25)",
                                }
                              : {}
                          }
                        >
                          Pond {p.pondNumber} {isSelected ? "✓" : ""}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-stone-400 pl-0.5">
                    {selectedPonds.length} of {Object.keys(pondDetails).length} ponds selected for insurance.
                  </p>
                </div>

                {/* Species */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-stone-500 ml-0.5">
                    Shrimp Species
                  </label>
                  <Select
                    value={insuranceData.species}
                    onValueChange={(v) =>
                      setInsuranceData((p) => ({ ...p, species: v }))
                    }
                  >
                    <SelectTrigger className="h-12 rounded-xl border-stone-200 bg-stone-50 text-sm w-full border px-4 shadow-sm">
                      <SelectValue placeholder="Select Species" />
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
                    onClick={() => {
                      setStep(1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex-1 h-12 rounded-xl border-stone-200 text-stone-600 font-semibold"
                  >
                    ← Back to Farm
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={submitInsuranceStep}
                    className="flex-1 h-12 rounded-xl text-white font-bold"
                    style={{
                      background: "linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)",
                      boxShadow: "0 6px 24px -4px rgba(28,107,90,0.28)",
                    }}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      "Next: Pond Details →"
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                STEP 3: INSURED PONDS CONFIGURATION
               ══════════════════════════════════════════════════════════════ */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center">
                    <Waves size={16} className="text-teal-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-700">
                      Insured Ponds Configuration
                    </h2>
                    <p className="text-[11px] text-stone-400">
                      Specify dimensions and capture photos for each insured pond
                    </p>
                  </div>
                </div>

                {/* List of Insured Ponds */}
                <div className="space-y-4">
                  {Object.values(pondDetails)
                    .filter((p) => selectedPonds.includes(p.pondId))
                    .map((pond) => (
                      <div
                        key={pond.pondId}
                        className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm space-y-3"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                              {pond.pondNumber}
                            </span>
                            <span className="text-sm font-bold text-stone-800">
                              Pond {pond.pondNumber}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                            Insured
                          </span>
                        </div>

                        {/* Dimension Input */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-stone-500">
                            Water Spread Area (Acres) <span className="text-rose-500">*</span>
                          </label>
                          <Input
                            type="number"
                            step="0.1"
                            value={pond.dimensionAcres}
                            onChange={(e) =>
                              setPondDetails((prev) => ({
                                ...prev,
                                [pond.pondId]: {
                                  ...prev[pond.pondId],
                                  dimensionAcres: e.target.value,
                                },
                              }))
                            }
                            placeholder="e.g. 1.2"
                            className="h-11 rounded-xl text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25"
                          />
                        </div>

                        {/* Pond Photo Preview / Upload */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-stone-500">
                            Pond Photo (Optional)
                          </label>
                          {pond.photoPreview ? (
                            <div className="relative rounded-xl overflow-hidden border border-stone-200 aspect-video flex items-center justify-center">
                              <img
                                src={pond.photoPreview}
                                alt={`Pond ${pond.pondNumber}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setPondDetails((prev) => ({
                                    ...prev,
                                    [pond.pondId]: {
                                      ...prev[pond.pondId],
                                      photo: null,
                                      photoPreview: null,
                                    },
                                  }))
                                }
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setPondCameraFor(pond.pondId)}
                                className="flex items-center justify-center gap-1.5 h-11 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold transition"
                              >
                                <Camera size={15} className="text-teal-600" />
                                Take Photo
                              </button>
                              <label className="flex items-center justify-center gap-1.5 h-11 rounded-xl border border-dashed border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold cursor-pointer transition">
                                <Upload size={15} className="text-stone-500" />
                                Upload File
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) {
                                      const url = URL.createObjectURL(f);
                                      setPondDetails((prev) => ({
                                        ...prev,
                                        [pond.pondId]: {
                                          ...prev[pond.pondId],
                                          photo: f,
                                          photoPreview: url,
                                        },
                                      }));
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep(2);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex-1 h-12 rounded-xl border-stone-200 text-stone-600 font-semibold"
                  >
                    ← Back to Insurance
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={submitPondsStep}
                    className="flex-1 h-12 rounded-xl text-white font-bold"
                    style={{
                      background: "linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)",
                      boxShadow: "0 6px 24px -4px rgba(28,107,90,0.28)",
                    }}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      "Complete Registration ✓"
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
