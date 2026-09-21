import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Camera,
  Upload,
  CheckCircle2,
  Waves,
  Maximize2,
  ShieldCheck,
  Info,
  X,
  MapPin,
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
import CameraCapture from "@/components/CameraCapture";
import axios from "@/lib/api";
import { fileToBase64 } from "@/lib/fileUtils";
import { LOCATIONS, STATES } from "@/constants/locations";

interface PondDetail {
  pondId: string;
  pondNumber: number;
  dimensionAcres: string;
  photo: File | null;
  photoPreview: string | null;
  // address
  village: string;
  taluk: string;
  district: string;
  state: string;
  pinCode: string;
}

const InsuredPonds = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Guard: if registration is already complete, skip back to daily entry
  useEffect(() => {
    if (localStorage.getItem('aqua-reg-complete') === '1') {
      navigate('/entries/daily', { replace: true });
    }
  }, []);

  // Load ponds from localStorage
  const farmData = JSON.parse(localStorage.getItem("aqua-farm") || "{}");
  const insuredPondIds: string[] = farmData.insuredPondIds || [];
  const allPonds: any[] = (farmData.ponds || []).filter((p: any) => {
    const id = p._id || p.pondId;
    return insuredPondIds.length === 0 || insuredPondIds.includes(id);
  });

  const totalPonds = allPonds.length;

  // Per-pond state
  const [pondDetails, setPondDetails] = useState<Record<string, PondDetail>>(
    () => {
      let draft: Record<string, any> | null = null;
      try {
        const draftStr = localStorage.getItem("draft_insured_ponds");
        if (draftStr) draft = JSON.parse(draftStr);
      } catch (e) {}

      const init: Record<string, PondDetail> = {};
      allPonds.forEach((p: any, i: number) => {
        const id = p._id || p.pondId || `pond-${i}`;
        const draftDetail = draft ? draft[id] : null;

        init[id] = {
          pondId: id,
          pondNumber: p.pondNumber || i + 1,
          dimensionAcres: draftDetail?.dimensionAcres ?? p.dimensionAcres ?? "",
          photo: null,
          photoPreview: null,
          village: draftDetail?.village ?? p.address?.village ?? "",
          taluk: draftDetail?.taluk ?? p.address?.taluk ?? "",
          district: draftDetail?.district ?? p.address?.district ?? "",
          state: draftDetail?.state ?? p.address?.state ?? "",
          pinCode: draftDetail?.pinCode ?? p.address?.pinCode ?? "",
        };
      });
      return init;
    }
  );

  useEffect(() => {
    // Exclude photo buffers/bases to keep local storage light
    const draftToSave: Record<string, any> = {};
    Object.keys(pondDetails).forEach(key => {
        const { photo, photoPreview, ...textFields } = pondDetails[key];
        draftToSave[key] = textFields;
    });
    localStorage.setItem("draft_insured_ponds", JSON.stringify(draftToSave));
  }, [pondDetails]);

  const { syncStatus } = useAutoSave(pondDetails);

  const [cameraOpenFor, setCameraOpenFor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const updateDimension = (id: string, value: string) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setPondDetails((prev) => ({
        ...prev,
        [id]: { ...prev[id], dimensionAcres: value },
      }));
    }
  };

  const updateAddress = (id: string, field: keyof PondDetail, value: string) => {
    setPondDetails((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleFileSelect = (id: string, file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPondDetails((prev) => ({
      ...prev,
      [id]: { ...prev[id], photo: file, photoPreview: url },
    }));
  };

  const handleCameraCapture = (file: File) => {
    if (!cameraOpenFor) return;
    const url = URL.createObjectURL(file);
    setPondDetails((prev) => ({
      ...prev,
      [cameraOpenFor]: { ...prev[cameraOpenFor], photo: file, photoPreview: url },
    }));
    setCameraOpenFor(null);
  };

  const clearPhoto = (id: string) => {
    if (pondDetails[id].photoPreview) {
      URL.revokeObjectURL(pondDetails[id].photoPreview!);
    }
    setPondDetails((prev) => ({
      ...prev,
      [id]: { ...prev[id], photo: null, photoPreview: null },
    }));
    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id]!.value = "";
    }
  };

  const completedCount = Object.values(pondDetails).filter(
    (p) => p.dimensionAcres && parseFloat(p.dimensionAcres) > 0
  ).length;

  const onSubmit = async () => {
    // Validate all ponds have dimension
    const missing = Object.values(pondDetails).filter(
      (p) => !p.dimensionAcres || parseFloat(p.dimensionAcres) <= 0
    );
    if (missing.length > 0) {
      toast.error(
        `Please enter dimension for all ${totalPonds} pond${totalPonds > 1 ? "s" : ""}.`
      );
      return;
    }

    try {
      setSubmitting(true);
      toast.loading("Saving pond details…", { id: "ponds-save" });

      const session = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = session.farmerId;
      const farmId = farmData.farmId;

      if (!farmerId || !farmId) {
        toast.dismiss("ponds-save");
        toast.error("Session expired. Please login again.");
        return;
      }

      // Build API payload — convert photos to base64 ONLY for the server request
      const pondPayload = await Promise.all(
        Object.values(pondDetails).map(async (pd) => ({
          pondId: pd.pondId,
          pondNumber: pd.pondNumber,
          dimensionAcres: parseFloat(pd.dimensionAcres),
          photo: pd.photo ? await fileToBase64(pd.photo) : null,
          address: {
            village: pd.village,
            taluk: pd.taluk,
            district: pd.district,
            state: pd.state,
            pinCode: pd.pinCode,
          },
        }))
      );

      const res = await axios.patch(
        `/api/farms/${farmId}/ponds`,
        {
          farmerId,
          ponds: pondPayload,
        }
      );

      if (res.data.success) {
        // Persist dimension + address in localStorage — never store base64 photos
        // (photos are large and will exceed the ~5 MB quota)
        const updatedPonds = (farmData.ponds || []).map((p: any) => {
          const id = p._id || p.pondId;
          const detail = pondDetails[id];
          return detail
            ? {
                ...p,
                dimensionAcres: parseFloat(detail.dimensionAcres),
                // keep any existing photo URL/flag already on the server record
                address: {
                  village: detail.village,
                  taluk: detail.taluk,
                  district: detail.district,
                  state: detail.state,
                  pinCode: detail.pinCode,
                },
              }
            : p;
        });
        localStorage.setItem(
          "aqua-farm",
          JSON.stringify({ ...farmData, ponds: updatedPonds })
        );

        localStorage.removeItem("draft_insured_ponds");
        // Mark full registration complete so back-button guards can redirect
        localStorage.setItem("aqua-reg-complete", "1");

        toast.dismiss("ponds-save");
        toast.success("Pond details saved successfully!");
        navigate("/entries/daily", { replace: true });
      }
    } catch (err: any) {
      toast.dismiss("ponds-save");
      console.error("Pond save error:", err);

      if ((err as any)?.name === "QuotaExceededError") {
        toast.error("Storage full. Please clear app data or free up space and try again.");
        return;
      }

      // On API error — save text fields only, never base64 photos (quota risk)
      const updatedPonds = (farmData.ponds || []).map((p: any) => {
        const id = p._id || p.pondId;
        const detail = pondDetails[id];
        return detail
          ? {
              ...p,
              dimensionAcres: parseFloat(detail.dimensionAcres),
              address: {
                village: detail.village,
                taluk: detail.taluk,
                district: detail.district,
                state: detail.state,
                pinCode: detail.pinCode,
              },
            }
          : p;
      });
      try {
        localStorage.setItem(
          "aqua-farm",
          JSON.stringify({ ...farmData, ponds: updatedPonds })
        );
        localStorage.setItem("aqua-reg-complete", "1");
        toast.success("Pond details saved locally (photos will sync when online).");
      } catch (storageErr) {
        console.error("localStorage write failed:", storageErr);
        toast.error("Could not save locally. Storage is full.");
      }
      navigate("/entries/daily", { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-stone-50 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] text-stone-800 font-sans">
      <SyncIndicator status={syncStatus} />
      {cameraOpenFor && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setCameraOpenFor(null)}
          title="Capture Pond Photo"
          facingMode="environment"
        />
      )}

      {/* ── HEADER ── */}
      <div
        className="px-5 pt-8 pb-7 rounded-b-[2.5rem] relative overflow-hidden"
        style={{
          background:
            "linear-gradient(140deg, #1c4a3e 0%, #1c6b5a 45%, #2d9b7f 100%)",
          boxShadow: "0 8px 32px -6px rgba(28,74,62,0.28)",
        }}
      >
        {/* decorative circle */}
        <div
          className="absolute top-0 right-0 w-40 h-40 rounded-full -mr-12 -mt-12 opacity-10"
          style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-24 h-24 rounded-full -ml-8 -mb-8 opacity-5"
          style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }}
        />

        <div className="flex items-center justify-between relative z-10 mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all touch-manipulation"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
                Insured Ponds
              </h1>
              <p className="text-[10px] text-white/60 mt-0.5">
                Add photo & dimension for each pond
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15 transition-opacity duration-200 ${syncStatus !== 'idle' ? 'opacity-0' : 'opacity-100'}`}>
            Aqua <span className="text-amber-300">AI</span>nsure
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-semibold text-white/70">
              {completedCount}/{totalPonds} ponds configured
            </span>
            <span className="text-[10px] font-bold text-amber-300">
              {totalPonds > 0
                ? Math.round((completedCount / totalPonds) * 100)
                : 0}
              %
            </span>
          </div>
          <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
              }}
              initial={{ width: 0 }}
              animate={{
                width: `${
                  totalPonds > 0
                    ? (completedCount / totalPonds) * 100
                    : 0
                }%`,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-4">
        {/* Info banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-4 py-3.5 bg-teal-50 border border-teal-100 rounded-2xl"
        >
          <div className="w-7 h-7 rounded-lg bg-teal-100 border border-teal-200 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck size={14} className="text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-teal-800 leading-tight">
              {totalPonds === 0
                ? "No insured ponds found"
                : `${totalPonds} pond${totalPonds > 1 ? "s" : ""} selected for insurance`}
            </p>
            <p className="text-[10px] text-teal-600 mt-0.5 leading-snug">
              {totalPonds === 0
                ? "Please go back to Insurance Registration and select ponds."
                : "Enter the size in acres and optionally capture a photo for each pond."}
            </p>
          </div>
        </motion.div>

        {/* No ponds state */}
        {totalPonds === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 gap-4"
          >
            <div className="w-20 h-20 rounded-3xl bg-stone-100 flex items-center justify-center">
              <Waves size={36} className="text-stone-300" />
            </div>
            <p className="text-sm font-semibold text-stone-400 text-center">
              No ponds to configure
            </p>
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="rounded-xl text-sm font-semibold border-stone-200"
            >
              Go Back
            </Button>
          </motion.div>
        )}

        {/* Pond cards */}
        <AnimatePresence>
          {Object.values(pondDetails).map((pd, idx) => (
            <motion.div
              key={pd.pondId}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div
                className="flex items-center justify-between px-5 py-3.5 border-b border-stone-50"
                style={{
                  background:
                    pd.dimensionAcres && parseFloat(pd.dimensionAcres) > 0
                      ? "linear-gradient(110deg, #f0fdf4 0%, #f0fdfa 100%)"
                      : "linear-gradient(110deg, #f9fafb 0%, #f3f4f6 100%)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black"
                    style={
                      pd.dimensionAcres && parseFloat(pd.dimensionAcres) > 0
                        ? {
                            background:
                              "linear-gradient(135deg, #1c6b5a, #2d9b7f)",
                            color: "white",
                          }
                        : { background: "#e5e7eb", color: "#6b7280" }
                    }
                  >
                    {pd.pondNumber}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-700 leading-tight">
                      Pond {pd.pondNumber}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      {pd.dimensionAcres && parseFloat(pd.dimensionAcres) > 0
                        ? `${pd.dimensionAcres} acres`
                        : "Dimension not set"}
                    </p>
                  </div>
                </div>
                {pd.dimensionAcres && parseFloat(pd.dimensionAcres) > 0 && (
                  <div className="flex items-center gap-1 text-teal-600">
                    <CheckCircle2 size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      Ready
                    </span>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Dimension field */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wide">
                    <Maximize2 size={11} className="text-teal-500" />
                    Pond Dimension (Acres)
                    <span className="text-red-400 text-[10px]">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      id={`pond-dim-${pd.pondId}`}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 1.25"
                      value={pd.dimensionAcres}
                      onChange={(e) =>
                        updateDimension(pd.pondId, e.target.value)
                      }
                      className="h-12 rounded-xl text-base sm:text-sm pr-16 border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25 focus-visible:border-teal-500 placeholder:text-stone-300"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 pointer-events-none">
                      acres
                    </span>
                  </div>
                  {pd.dimensionAcres && parseFloat(pd.dimensionAcres) > 0 && (
                    <p className="text-[10px] text-teal-600 pl-1 font-medium">
                      ≈{" "}
                      {(parseFloat(pd.dimensionAcres) * 4046.86).toLocaleString(
                        "en-IN",
                        { maximumFractionDigits: 0 }
                      )}{" "}
                      m²
                    </p>
                  )}
                </div>

                {/* Photo section */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wide">
                    <Camera size={11} className="text-teal-500" />
                    Pond Photo
                    <span className="text-stone-300 text-[10px] normal-case font-medium">
                      (optional)
                    </span>
                  </label>

                  {pd.photoPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-stone-100">
                      <img
                        src={pd.photoPreview}
                        alt={`Pond ${pd.pondNumber}`}
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-lg px-2 py-1">
                          <CheckCircle2 size={11} className="text-white" />
                          <span className="text-[10px] font-semibold text-white truncate max-w-[140px]">
                            {pd.photo?.name || "Captured"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => clearPhoto(pd.pondId)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/80 backdrop-blur-sm text-white hover:bg-red-600/90 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {/* File upload */}
                      <label className="flex-1 flex items-center justify-between h-12 px-4 rounded-xl border border-dashed border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100 hover:border-teal-200 transition-all group">
                        <span className="text-xs text-stone-400 font-medium group-hover:text-stone-500 transition-colors">
                          Browse gallery
                        </span>
                        <Upload
                          size={15}
                          className="text-stone-300 group-hover:text-teal-500 transition-colors"
                        />
                        <input
                          ref={(el) => {
                            fileInputRefs.current[pd.pondId] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFileSelect(pd.pondId, e.target.files?.[0])
                          }
                        />
                      </label>

                      {/* Camera capture */}
                      <button
                        type="button"
                        onClick={() => setCameraOpenFor(pd.pondId)}
                        className="flex items-center justify-center w-14 h-12 rounded-xl border border-stone-200 bg-stone-50 hover:bg-teal-50 hover:border-teal-200 transition-all group"
                        title="Open camera"
                      >
                        <Camera
                          size={18}
                          className="text-stone-400 group-hover:text-teal-600 transition-colors"
                        />
                      </button>
                    </div>
                  )}
                </div>

                {/* Address section */}
                <div className="space-y-2 pt-3 border-t border-stone-100">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wide">
                    <MapPin size={11} className="text-teal-500" />
                    Pond Address
                    <span className="text-stone-300 text-[10px] normal-case font-medium">(optional)</span>
                  </label>

                  {/* Village */}
                  <Input
                    placeholder="Village / Place name"
                    value={pd.village}
                    onChange={(e) => updateAddress(pd.pondId, "village", e.target.value)}
                    className="h-12 rounded-xl text-base sm:text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25 focus-visible:border-teal-500 placeholder:text-stone-300"
                  />

                  {/* State dropdown */}
                  <Select
                    value={pd.state}
                    onValueChange={(v) => {
                      updateAddress(pd.pondId, "state", v);
                      updateAddress(pd.pondId, "district", "");
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-xl text-base sm:text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* District dropdown — cascades from state */}
                  <Select
                    value={pd.district}
                    onValueChange={(v) => updateAddress(pd.pondId, "district", v)}
                    disabled={!pd.state}
                  >
                    <SelectTrigger className="h-12 rounded-xl text-base sm:text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25">
                      <SelectValue placeholder={pd.state ? "Select District" : "Select State first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(LOCATIONS[pd.state] || []).map((d: string) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Taluk */}
                  <Input
                    placeholder="Taluk / Mandal"
                    value={pd.taluk}
                    onChange={(e) => updateAddress(pd.pondId, "taluk", e.target.value)}
                    className="h-12 rounded-xl text-base sm:text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25 focus-visible:border-teal-500 placeholder:text-stone-300"
                  />

                  {/* Pin Code */}
                  <Input
                    placeholder="Pin Code"
                    value={pd.pinCode}
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(e) => updateAddress(pd.pondId, "pinCode", e.target.value.replace(/\D/g, ""))}
                    className="h-12 rounded-xl text-base sm:text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25 focus-visible:border-teal-500 placeholder:text-stone-300"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Summary card */}
        {totalPonds > 0 && completedCount === totalPonds && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 px-4 py-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl"
          >
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-800">
                All ponds configured!
              </p>
              <p className="text-[10px] text-emerald-600 mt-0.5">
                Total area:{" "}
                <span className="font-bold">
                  {Object.values(pondDetails)
                    .reduce(
                      (sum, p) => sum + (parseFloat(p.dimensionAcres) || 0),
                      0
                    )
                    .toFixed(2)}{" "}
                  acres
                </span>{" "}
                across {totalPonds} ponds
              </p>
            </div>
          </motion.div>
        )}

        {/* Hint for required field */}
        {totalPonds > 0 && (
          <div className="flex items-center gap-1.5 px-1">
            <Info size={11} className="text-stone-300" />
            <p className="text-[10px] text-stone-300">
              Dimension in acres is required for all ponds. Photo is optional.
            </p>
          </div>
        )}

        {/* Submit button */}
        {totalPonds > 0 && (
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="w-full h-14 rounded-2xl text-white font-bold text-sm"
            style={{
              background:
                "linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)",
              boxShadow: "0 6px 24px -4px rgba(28,107,90,0.30)",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                Saving…
              </span>
            ) : (
              `Save & Continue →`
            )}
          </Button>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default InsuredPonds;
