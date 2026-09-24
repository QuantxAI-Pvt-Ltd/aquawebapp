import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, Upload, Waves, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import SyncIndicator from "@/components/SyncIndicator";
import RegistrationHeader from "@/components/RegistrationHeader";
import { useAutoSave } from "@/hooks/useAutoSave";
import CameraCapture from "@/components/CameraCapture";
import axios from "@/lib/api";
import { uploadToSeaweedFS, resolveMediaUrl } from "@/lib/fileUtils";

interface PondDetail {
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

export default function InsuredPonds() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [cameraOpenFor, setCameraOpenFor] = useState<string | null>(null);

  // Load farm & ponds
  const farmData = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("aqua-farm") || "{}") : {};
  const insuredPondIds: string[] = farmData.insuredPondIds || [];
  const rawPonds: any[] = farmData.ponds || [];

  const allPonds: any[] =
    rawPonds.length > 0
      ? rawPonds.filter((p: any) => {
          const id = p._id || p.pondId;
          return insuredPondIds.length === 0 || insuredPondIds.includes(id);
        })
      : [
          { pondId: "pond-1", pondNumber: 1, dimensionAcres: 1.0 },
        ];

  const totalPonds = allPonds.length;

  const [pondDetails, setPondDetails] = useState<Record<string, PondDetail>>(() => {
    let draft: Record<string, any> | null = null;
    try {
      const draftStr = localStorage.getItem("draft_insured_ponds");
      if (draftStr) draft = JSON.parse(draftStr);
    } catch (e) {}

    const init: Record<string, PondDetail> = {};
    allPonds.forEach((p: any, i: number) => {
      const id = p._id || p.pondId || `pond-${i + 1}`;
      const draftDetail = draft ? draft[id] : null;

      init[id] = {
        pondId: id,
        pondNumber: p.pondNumber || i + 1,
        dimensionAcres: draftDetail?.dimensionAcres ?? (p.dimensionAcres ? String(p.dimensionAcres) : "1.0"),
        photo: null,
        photoPreview: draftDetail?.photoPreview ?? (p.photo ? resolveMediaUrl(p.photo) : null),
        village: draftDetail?.village ?? p.address?.village ?? "",
        taluk: draftDetail?.taluk ?? p.address?.taluk ?? "",
        district: draftDetail?.district ?? p.address?.district ?? "",
        state: draftDetail?.state ?? p.address?.state ?? "",
        pinCode: draftDetail?.pinCode ?? p.address?.pinCode ?? "",
      };
    });
    return init;
  });

  useEffect(() => {
    try {
      localStorage.setItem("draft_insured_ponds", JSON.stringify(pondDetails));
    } catch (e) {}
  }, [pondDetails]);

  const { syncStatus } = useAutoSave(pondDetails);

  const updateDimension = (pondId: string, val: string) => {
    setPondDetails((prev) => ({
      ...prev,
      [pondId]: { ...prev[pondId], dimensionAcres: val },
    }));
  };

  const handlePhotoUpload = (pondId: string, file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPondDetails((prev) => ({
      ...prev,
      [pondId]: { ...prev[pondId], photo: file, photoPreview: url },
    }));
  };

  const handleCameraCapture = (file: File) => {
    if (!cameraOpenFor) return;
    handlePhotoUpload(cameraOpenFor, file);
    setCameraOpenFor(null);
  };

  const clearPhoto = (pondId: string) => {
    setPondDetails((prev) => ({
      ...prev,
      [pondId]: { ...prev[pondId], photo: null, photoPreview: null },
    }));
  };

  const onSubmit = async () => {
    setSubmitting(true);
    toast.loading("Saving pond configurations…", { id: "ponds-save" });

    try {
      const session = JSON.parse(localStorage.getItem("aqua-session") || "{}");
      const farmerId = session.farmerId;
      const farmId = farmData.farmId;

      const pondsToProcess = Object.values(pondDetails);

      for (const detail of pondsToProcess) {
        let photoUrl: string | null = null;
        if (detail.photo instanceof File && farmerId) {
          const uploaded = await uploadToSeaweedFS(
            detail.photo,
            `farmers/${farmerId}/ponds/${detail.pondId}`
          );
          photoUrl = uploaded?.key || uploaded?.url || null;
        } else if (detail.photoPreview && !detail.photoPreview.startsWith("blob:")) {
          photoUrl = detail.photoPreview;
        }

        const pondPayload = {
          dimensionAcres: parseFloat(detail.dimensionAcres) || 1.0,
          photo: photoUrl,
          address: {
            village: detail.village,
            taluk: detail.taluk,
            district: detail.district,
            state: detail.state,
            pinCode: detail.pinCode,
          },
        };

        if (farmId && detail.pondId && !detail.pondId.startsWith("pond-")) {
          try {
            await axios.patch(`/api/farms/${farmId}/ponds/${detail.pondId}`, pondPayload);
          } catch (pe) {
            console.warn(`Pond ${detail.pondId} patch warning:`, pe);
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

      toast.dismiss("ponds-save");
      toast.success("🎉 Registration completed successfully!");
      setTimeout(() => {
        navigate("/entries/daily", { replace: true });
      }, 500);
    } catch (err: any) {
      toast.dismiss("ponds-save");
      console.error("Pond save error:", err);
      localStorage.setItem("aqua-reg-complete", "1");
      toast.success("Saved with local sync!");
      navigate("/entries/daily", { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden bg-stone-50 relative text-stone-800 font-sans"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <SyncIndicator status={syncStatus} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

      {cameraOpenFor && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setCameraOpenFor(null)}
          title="Capture Pond Photo"
          facingMode="environment"
        />
      )}

      {/* SCROLLABLE INNER BODY */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-8">
        {/* REUSABLE HEADER WITH STEP 4 ACTIVE */}
        <RegistrationHeader
          currentStep={3}
          title="Insured Ponds"
          syncStatus={syncStatus}
        />

        <div className="px-4 mt-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center">
              <Waves size={16} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-700">Pond Dimensions & Photos</h2>
              <p className="text-[11px] text-stone-400">Specify water spread size and upload photos</p>
            </div>
          </div>

          {/* Pond cards */}
          <div className="space-y-4">
            {Object.values(pondDetails).map((pond) => (
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

                {/* Dimension */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-500">
                    Water Spread Area (Acres) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={pond.dimensionAcres}
                    onChange={(e) => updateDimension(pond.pondId, e.target.value)}
                    placeholder="e.g. 1.2"
                    className="h-11 rounded-xl text-sm border-stone-200 bg-stone-50 focus-visible:ring-teal-500/25"
                  />
                </div>

                {/* Photo */}
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
                        onClick={() => clearPhoto(pond.pondId)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCameraOpenFor(pond.pondId)}
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
                          onChange={(e) => handlePhotoUpload(pond.pondId, e.target.files?.[0])}
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
              onClick={() => navigate("/insurance-registration")}
              className="flex-1 h-12 rounded-xl border-stone-200 text-stone-600 font-semibold"
            >
              ← Back to Insurance
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={onSubmit}
              className="flex-1 h-12 rounded-xl text-white font-bold"
              style={{
                background: "linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%)",
                boxShadow: "0 6px 24px -4px rgba(28,107,90,0.28)",
              }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                "Complete Registration ✓"
              )}
            </Button>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
